'use server';

import { createClient } from '@/lib/supabase/server';
import type { SalesSummary, TopProduct, LowStockProduct } from '@/lib/types';

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

// Get sales by date range for charts
export async function getSalesByDateRange(from: string, to: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('sales')
        .select('created_at, total_amount')
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

// Get inventory value
export async function getInventoryValue() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('products')
        .select('stock_on_hand, cost, price')
        .eq('is_active', true);

    if (error) {
        return { data: null, error: error.message };
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
