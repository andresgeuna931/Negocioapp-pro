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

export async function cancelSale(saleId: string, reason?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: 'Perfil no encontrado' };

    const { hasPermission } = await import('@/lib/permissions');
    if (!hasPermission(profile.role, 'reports:view_all')) {
        return { success: false, error: 'Solo el dueño o administrador puede anular ventas' };
    }

    const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`*, items:sale_items(*)`)
        .eq('id', saleId)
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (saleError || !sale) return { success: false, error: 'Venta no encontrada' };
    if (sale.is_cancelled) return { success: false, error: 'La venta ya fue anulada' };

    const { error: updateError } = await supabase
        .from('sales')
        .update({
            is_cancelled: true,
            cancelled_at: new Date().toISOString(),
            cancelled_by: user.id,
            cancellation_reason: reason || 'Anulada por operador',
        })
        .eq('id', saleId)
        .eq('tenant_id', profile.tenant_id);

    if (updateError) return { success: false, error: updateError.message };

    // Restaurar stock de cada item
    for (const item of (sale.items || [])) {
        const { data: product } = await supabase
            .from('products')
            .select('stock_on_hand')
            .eq('id', item.product_id)
            .eq('tenant_id', profile.tenant_id)
            .single();

        if (product) {
            const newStock = product.stock_on_hand + Number(item.qty);
            await supabase
                .from('products')
                .update({ stock_on_hand: newStock })
                .eq('id', item.product_id)
                .eq('tenant_id', profile.tenant_id);

            await supabase.from('inventory_movements').insert({
                tenant_id: profile.tenant_id,
                product_id: item.product_id,
                type: 'adjustment',
                qty_change: Number(item.qty),
                stock_before: product.stock_on_hand,
                stock_after: newStock,
                notes: `Anulación venta #${saleId.slice(0, 8)}`,
                created_by: user.id,
            });
        }
    }

    // Si era venta fiada, revertir movimiento de cuenta corriente
    if (sale.payment_method === 'mixed') {
        const { data: movement } = await supabase
            .from('account_movements')
            .select('id, account_id, amount')
            .eq('reference_id', saleId)
            .eq('type', 'sale')
            .single();

        if (movement) {
            await supabase.from('account_movements').insert({
                tenant_id: profile.tenant_id,
                account_id: movement.account_id,
                type: 'adjustment_credit',
                amount: movement.amount,
                description: `Anulación venta #${saleId.slice(0, 8)}`,
                reference_id: saleId,
                created_by: user.id,
            } as any);
        }
    }

    // Ajustar totales de caja si hay sesión abierta
    const { data: openSession } = await supabase
        .from('cash_sessions')
        .select('id, total_sales_cash, total_sales_other')
        .eq('status', 'open')
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (openSession) {
        if (sale.payment_method === 'cash') {
            await supabase
                .from('cash_sessions')
                .update({ total_sales_cash: Math.max(0, openSession.total_sales_cash - Number(sale.total_amount)) })
                .eq('id', openSession.id);
        } else if (sale.payment_method !== 'mixed') {
            await supabase
                .from('cash_sessions')
                .update({ total_sales_other: Math.max(0, openSession.total_sales_other - Number(sale.total_amount)) })
                .eq('id', openSession.id);
        }
    }

    revalidatePath('/caja');
    revalidatePath('/ventas');
    revalidatePath('/clientes');
    revalidatePath('/reportes');

    return { success: true, error: null };
}
