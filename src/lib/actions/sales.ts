'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Sale, PaymentMethod, CreateSaleData } from '@/lib/types';
import { updateCashSessionFromSale } from './cash';

// Helper to get current user's tenant_id
async function getCurrentUserContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return null;
    return { supabase, user, tenantId: profile.tenant_id };
}

// Create a new sale using the database function
export async function createSale(saleData: CreateSaleData) {
    const supabase = await createClient();

    // Check subscription status
    const { canPerformAction } = await import('./auth');
    const allowed = await canPerformAction();
    if (!allowed) {
        return { data: null, error: 'Tu período de prueba ha finalizado. Suscribite para seguir vendiendo.' };
    }

    // Get tenant context FIRST (needed for all subsequent tenant-scoped queries)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'No autenticado' };
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) return { data: null, error: 'Tenant no encontrado' };
    const tenantId = profile.tenant_id;

    // Check if there's an open cash session FOR THIS TENANT
    const { data: openSession } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'open')
        .single();

    if (!openSession) {
        return { data: null, error: 'No hay caja abierta. Abrí la caja antes de realizar ventas.' };
    }

    // Validate items
    if (!saleData.items || saleData.items.length === 0) {
        return { data: null, error: 'La venta debe tener al menos un producto' };
    }

    let estimatedTotal = 0;
    if (saleData.payment_method === 'account') {
        if (!saleData.customer_id) {
            return { data: null, error: 'Se requiere cliente para Cuenta Corriente' };
        }

        // Obtener cuenta del cliente - filtered by tenant via customer
        const { data: customerAccount } = await supabase
            .from('customer_accounts')
            .select(`
                id,
                balance,
                customer:customers(credit_limit, full_name)
            `)
            .eq('customer_id', saleData.customer_id)
            .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
            .single();

        if (!customerAccount) {
            return { data: null, error: 'El cliente no tiene cuenta habilitada.' };
        }

        // Calcular total - also filter products by tenant
        const productIds = saleData.items.map(i => i.product_id);
        const { data: products } = await supabase
            .from('products')
            .select('id, price')
            .in('id', productIds)
            .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant

        if (products) {
            saleData.items.forEach(item => {
                const p = products.find(prod => prod.id === item.product_id);
                if (p) estimatedTotal += p.price * item.qty;
            });
        }

        const customerData = Array.isArray(customerAccount.customer) ? customerAccount.customer[0] : customerAccount.customer;
        const limit = customerData?.credit_limit || 0;

        if (limit > 0 && (Number(customerAccount.balance) + estimatedTotal > limit)) {
            return {
                data: null,
                error: `Límite excedido. Saldo: $${customerAccount.balance} + Actual: $${estimatedTotal} > Límite: $${limit}`
            };
        }
    }

    // Call the process_sale function (RPC uses auth.uid() internally)
    const dbPaymentMethod = saleData.payment_method === 'account' ? 'mixed' : saleData.payment_method;
    const notes = saleData.notes || (saleData.payment_method === 'account' ? 'Venta en Cta. Cte.' : null);

    const { data: saleId, error } = await supabase.rpc('process_sale', {
        p_items: saleData.items,
        p_payment_method: dbPaymentMethod,
        p_notes: notes,
    });

    if (error) {
        console.error('Error creating sale:', error);
        return { data: null, error: error.message };
    }

    if (saleData.payment_method === 'account' && saleData.customer_id) {
        const { data: customerAccount } = await supabase
            .from('customer_accounts')
            .select('id')
            .eq('customer_id', saleData.customer_id)
            .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
            .single();

        if (customerAccount) {
            const { data: saleRecord } = await supabase
                .from('sales')
                .select('total_amount')
                .eq('id', saleId)
                .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
                .single();

            const finalAmount = saleRecord?.total_amount || estimatedTotal;

            const { error: moveError } = await supabase
                .from('account_movements')
                .insert({
                    tenant_id: tenantId,
                    account_id: customerAccount.id,
                    type: 'sale',
                    amount: finalAmount,
                    description: 'Compra en mostrador',
                    reference_id: saleId,
                    created_by: user.id
                } as any);

            if (moveError) {
                console.error('Error creating account movement:', moveError);
                return { data: saleId, error: `Venta creada, pero falló registro de deuda: ${moveError.message}` };
            }
        }
    }

    // Get the sale total to update cash session
    const { data: saleRecord } = await supabase
        .from('sales')
        .select('total_amount, payment_method')
        .eq('id', saleId)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (saleRecord) {
        await updateCashSessionFromSale(
            Number(saleRecord.total_amount),
            saleRecord.payment_method
        );
    }

    revalidatePath('/');
    revalidatePath('/ventas');
    revalidatePath('/productos');
    revalidatePath('/reportes');
    revalidatePath('/caja');
    revalidatePath('/clientes');

    return { data: saleId as string, error: null };
}

export async function getSales(options?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    let query = supabase
        .from('sales')
        .select(`
      *,
      seller:profiles(full_name),
      items:sale_items(
        id,
        product_name,
        qty,
        unit_price,
        line_total,
        product:products(unit_type)
      )
    `)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .order('created_at', { ascending: false });

    if (options?.from) query = query.gte('created_at', options.from);
    if (options?.to) query = query.lte('created_at', options.to);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching sales:', error);
        return { data: null, error: error.message };
    }

    return { data: data as Sale[], error: null };
}

export async function getTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getSales({ from: today.toISOString(), limit: 50 });
}

export async function getSaleById(id: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('sales')
        .select(`
      *,
      seller:profiles(full_name, email),
      items:sale_items(
        id,
        product_id,
        product_name,
        qty,
        unit_price,
        line_total,
        product:products(unit_type, barcode)
      )
    `)
        .eq('id', id)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Sale, error: null };
}

export async function getSalesStats() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { today: { count: 0, total: 0 }, month: { count: 0, total: 0 } };
    const { supabase, tenantId } = ctx;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats - filtered by tenant
    const { data: todayStats } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .gte('created_at', today.toISOString());

    // Month stats - filtered by tenant
    const { data: monthStats } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .gte('created_at', monthStart.toISOString());

    const todayTotal = todayStats?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const todayCount = todayStats?.length || 0;
    const monthTotal = monthStats?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const monthCount = monthStats?.length || 0;

    return {
        today: { count: todayCount, total: todayTotal },
        month: { count: monthCount, total: monthTotal },
    };
}
