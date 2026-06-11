'use server';

import { createClient } from '@/lib/supabase/server';
import type { SalesSummary, TopProduct, LowStockProduct } from '@/lib/types';

// Helper to get current user's tenant_id
async function getCurrentTenantId() {
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

// Get sales summary for a period
export async function getSalesSummary(period: 'today' | 'week' | 'month' | 'year' = 'today') {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_sales_summary', {
        p_period: period,
    });

    if (error) {
        console.error('Error fetching sales summary:', error);
        return { data: null, error: error.message };
    }

    // RPC returns array, get first item
    const summary = Array.isArray(data) ? data[0] : data;

    return {
        data: {
            total_sales: Number(summary?.total_sales || 0),
            total_amount: Number(summary?.total_amount || 0),
            average_sale: Number(summary?.average_sale || 0),
        } as SalesSummary,
        error: null
    };
}

// Get sales summary for a custom date range
export async function getSalesSummaryByRange(from: string, to: string) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', from)
        .lte('created_at', to);

    if (error) {
        return { data: null, error: error.message };
    }

    const total_sales = data.length;
    const total_amount = data.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const average_sale = total_sales > 0 ? total_amount / total_sales : 0;

    return {
        data: { total_sales, total_amount, average_sale } as SalesSummary,
        error: null,
    };
}

// Get top selling products
export async function getTopProducts(
    limit: number = 5,
    period: 'today' | 'week' | 'month' | 'year' = 'month'
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_top_products', {
        p_limit: limit,
        p_period: period,
    });

    if (error) {
        console.error('Error fetching top products:', error);
        return { data: null, error: error.message };
    }

    return { data: data as TopProduct[], error: null };
}

// Get top selling products for a custom date range
export async function getTopProductsByRange(limit: number = 10, from: string, to: string) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('sale_items')
        .select(`
            product_id,
            quantity,
            subtotal,
            unit_type,
            sales!inner(created_at, tenant_id)
        `)
        .eq('sales.tenant_id', tenantId)
        .gte('sales.created_at', from)
        .lte('sales.created_at', to);

    if (error) {
        console.error('Error fetching top products by range:', error);
        return { data: null, error: error.message };
    }

    // Agrupar por producto
    const productMap: Record<string, { product_id: string; product_name: string; total_qty: number; total_revenue: number; unit_type: string }> = {};

    for (const item of data as any[]) {
        const id = item.product_id;
        if (!productMap[id]) {
            productMap[id] = {
                product_id: id,
                product_name: item.product_name || id,
                total_qty: 0,
                total_revenue: 0,
                unit_type: item.unit_type || 'unit',
            };
        }
        productMap[id].total_qty += Number(item.quantity);
        productMap[id].total_revenue += Number(item.subtotal);
    }

    const sorted = Object.values(productMap)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

    return { data: sorted as TopProduct[], error: null };
}

// Get low stock products
export async function getLowStockReport() {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_low_stock_products');

    if (error) {
        console.error('Error fetching low stock:', error);
        return { data: null, error: error.message };
    }

    return { data: data as LowStockProduct[], error: null };
}

// Get dashboard data (all in one call)
export async function getDashboardData() {
    const [todaySummary, monthSummary, topProducts, lowStock] = await Promise.all([
        getSalesSummary('today'),
        getSalesSummary('month'),
        getTopProducts(5, 'month'),
        getLowStockReport(),
    ]);

    return {
        today: todaySummary.data,
        month: monthSummary.data,
        topProducts: topProducts.data,
        lowStock: lowStock.data,
    };
}

// Get sales by date range for charts - WITH TENANT FILTER
export async function getSalesByDateRange(from: string, to: string) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at');

    if (error) {
        return { data: null, error: error.message };
    }

    // Group by date
    const salesByDate: Record<string, { count: number; total: number }> = {};

    data.forEach((sale) => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!salesByDate[date]) {
            salesByDate[date] = { count: 0, total: 0 };
        }
        salesByDate[date].count += 1;
        salesByDate[date].total += Number(sale.total_amount);
    });

    return {
        data: Object.entries(salesByDate).map(([date, stats]) => ({
            date,
            ...stats,
        })),
        error: null
    };
}

// Get inventory value - WITH TENANT FILTER
export async function getInventoryValue() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('products')
        .select('stock_on_hand, cost, price')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    if (error) {
        return { data: null, error: error.message }
    }

    const atCost = data.reduce((sum, p) => {
        return sum + (Number(p.stock_on_hand) * Number(p.cost || 0));
    }, 0);

    const atPrice = data.reduce((sum, p) => {
        return sum + (Number(p.stock_on_hand) * Number(p.price));
    }, 0);

    return {
        data: {
            totalProducts: data.length,
            valueAtCost: atCost,
            valueAtPrice: atPrice,
            potentialProfit: atPrice - atCost,
        },
        error: null,
    };
}

export async function getSalesHistory(days: number = 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const { data } = await getSalesByDateRange(from.toISOString(), to.toISOString());

    const filledData = [];
    for (let i = 0; i <= days; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const existing = data?.find(item => item.date === dateStr);
        filledData.push({
            date: dateStr,
            total: existing ? existing.total : 0,
            count: existing ? existing.count : 0
        });
    }

    return filledData;
}
