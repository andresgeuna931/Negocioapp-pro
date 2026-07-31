'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Sale, CreateSaleData } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';

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

    if (!saleData.items || saleData.items.length === 0) {
        return { data: null, error: 'La venta debe tener al menos un producto' };
    }

    const notes = saleData.notes
        || (saleData.payment_method === 'account' ? 'Venta en Cta. Cte.' : null);

    // BL-11: venta, items, stock, deuda de cuenta corriente e impacto en caja
    // ocurren dentro de una única transacción PostgreSQL.
    const { data: result, error } = await supabase.rpc('process_sale_v4', {
        p_items: saleData.items,
        p_payment_method: saleData.payment_method,
        p_notes: notes,
        p_customer_id: saleData.customer_id || null,
    });

    if (error) {
        console.error('Error creating sale:', error);
        return { data: null, error: error.message };
    }

    if (!result?.success) {
        return { data: null, error: result?.error || 'Error al procesar la venta' };
    }

    const saleId = result.sale_id as string;

    revalidatePath('/');
    revalidatePath('/ventas');
    revalidatePath('/productos');
    revalidatePath('/reportes');
    revalidatePath('/caja');
    revalidatePath('/clientes');

    try {
        const tenantId = await getTenantId();
        if (tenantId) {
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
        }
    } catch (stockNotifError) {
        console.error('Error en notificación de stock bajo:', stockNotifError);
    }

    return { data: saleId, error: null };
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

    if (!hasPermission(profile.role, 'reports:view_all')) {
        return { success: false, error: 'Solo el dueño o administrador puede anular ventas' };
    }

    // Llamar al RPC transaccional — todo ocurre en una sola transacción PostgreSQL
    const { data: result, error } = await supabase.rpc('cancel_sale_v2', {
        p_sale_id: saleId,
        p_reason: reason || 'Anulada por operador',
    });

    if (error) {
        console.error('Error anulando venta:', error);
        return { success: false, error: error.message };
    }

    if (!result?.success) {
        return { success: false, error: result?.error || 'Error al anular la venta' };
    }

    revalidatePath('/caja');
    revalidatePath('/ventas');
    revalidatePath('/clientes');
    revalidatePath('/reportes');

    return { success: true, error: null };
}
