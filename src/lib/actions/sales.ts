'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Sale, CreateSaleData } from '@/lib/types';
import { updateCashSessionFromSale } from './cash';

async function getTenantId(): Promise<string | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
    return profile?.tenant_id || null;
}

export async function createSale(saleData: CreateSaleData) {
    const supabase = await createClient();

    const { canPerformAction } = await import('./auth');
    const allowed = await canPerformAction();
    if (!allowed) {
        return { data: null, error: 'Tu período de prueba ha finalizado. Suscribite para seguir vendiendo.' };
    }

    // Check if there's an open cash session
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { data: null, error: 'No autenticado' };

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', currentUser.id)
        .single();

    if (!currentProfile?.tenant_id) return { data: null, error: 'Perfil no encontrado' };

    const { data: openSession } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('status', 'open')
        .eq('tenant_id', currentProfile.tenant_id)
        .single();

    if (!openSession) {
        return { data: null, error: 'No hay caja abierta. Abrí la caja antes de realizar ventas.' };
    }

    if (!saleData.items || saleData.items.length === 0) {
        return { data: null, error: 'La venta debe tener al menos un producto' };
    }

    let estimatedTotal = 0;
    if (saleData.payment_method === 'account') {
        if (!saleData.customer_id) {
            return { data: null, error: 'Se requiere cliente para Cuenta Corriente' };
        }

        const { data: customerAccount } = await supabase
            .from('customer_accounts')
            .select(`id, balance, customer:customers(credit_limit, full_name)`)
            .eq('customer_id', saleData.customer_id)
            .single();

        if (!customerAccount) {
            return { data: null, error: 'El cliente no tiene cuenta habilitada.' };
        }

        const productIds = saleData.items.map(i => i.product_id);
        const { data: products } = await supabase
            .from('products')
            .select('id, price')
            .in('id', productIds);

        if (products) {
            saleData.items.forEach(item => {
                const p = products.find(prod => prod.id === item.product_id);
                if (p) estimatedTotal += p.price * item.qty;
            });
        }

        const customerData = Array.isArray(customerAccount.customer) ? customerAccount.customer[0] : customerAccount.customer;
        const limit = customerData?.credit_limit ?? 0;

        // BUG FIX: límite 0 = sin crédito permitido
        if (limit === 0) {
            return {
                data: null,
                error: `${customerData?.full_name || 'El cliente'} no tiene límite de crédito habilitado. El dueño debe asignarle un límite antes de fiar.`
            };
        }

        if (Number(customerAccount.balance) + estimatedTotal > limit) {
            return {
                data: null,
                error: `Límite de crédito excedido. Debe: $${Number(customerAccount.balance).toLocaleString('es-AR')} + Venta: $${estimatedTotal.toLocaleString('es-AR')} > Límite: $${limit.toLocaleString('es-AR')}`
            };
        }
    }

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
            .single();

        if (customerAccount) {
            const { data: saleRecord } = await supabase
                .from('sales')
                .select('total_amount')
                .eq('id', saleId)
                .single();

            const finalAmount = saleRecord?.total_amount || estimatedTotal;

            const { error: moveError } = await supabase
                .from('account_movements')
                .insert({
                    tenant_id: currentProfile.tenant_id,
                    account_id: customerAccount.id,
                    type: 'sale',
                    amount: finalAmount,
                    description: 'Compra en mostrador',
                    reference_id: saleId,
                    created_by: currentUser.id
                } as any);

            if (moveError) {
                console.error('Error creating account movement:', moveError);
                return { data: saleId, error: `Venta creada, pero falló registro de deuda: ${moveError.message}` };
            }
        }
    }

    const { data: saleRecord } = await supabase
        .from('sales')
        .select('total_amount, payment_method')
        .eq('id', saleId)
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

    try {
        const tenantId = currentProfile.tenant_id;
        const productIds = saleData.items.map(i => i.product_id);

        const { data: lowStockProducts } = await supabase.rpc('get_low_stock_products');

        if (lowStockProducts && lowStockProducts.length > 0) {
            const { createTenantNotification, tenantNotificationExists } = await import('./tenant-notifications');

            const relevantProducts = lowStockProducts.filter((p: any) =>
                productIds.includes(p.id)
            );

            for (const product of relevantProducts) {
                const alreadyNotified = await tenantNotificationExists(
                    tenantId,
                    'stock_low',
                    product.name
                );

                if (!alreadyNotified) {
                    await createTenantNotification(
                        tenantId,
                        'stock_low',
                        '📦 Stock bajo',
                        `${product.name} — quedan ${product.stock_on_hand} unidades`
                    );
                }
            }
        }
    } catch (stockNotifError) {
        console.error('Error en notificación de stock bajo:', stockNotifError);
    }

    return { data: saleId as string, error: null };
}

export async function getSales(options?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    let query = supabase
        .from('sales')
        .select(`
            *,
            seller:profiles(full_name),
            items:sale_items(
                id, product_name, qty, unit_price, line_total,
                product:products(unit_type)
            )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (options?.from) query = query.gte('created_at', options.from);
    if (options?.to) query = query.lte('created_at', options.to);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as Sale[], error: null };
}

export async function getTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getSales({ from: today.toISOString(), limit: 50 });
}

export async function getSaleById(id: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            seller:profiles(full_name, email),
            items:sale_items(
                id, product_id, product_name, qty, unit_price, line_total,
                product:products(unit_type, barcode)
            )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Sale, error: null };
}

export async function getSalesStats() {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { today: { count: 0, total: 0 }, month: { count: 0, total: 0 } };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: todayStats } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', today.toISOString());

    const { data: monthStats } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart.toISOString());

    return {
        today: {
            count: todayStats?.length || 0,
            total: todayStats?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        },
        month: {
            count: monthStats?.length || 0,
            total: monthStats?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        },
    };
}
