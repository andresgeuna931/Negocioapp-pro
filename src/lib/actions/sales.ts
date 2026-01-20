'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Sale, PaymentMethod, CreateSaleData } from '@/lib/types';
import { updateCashSessionFromSale } from './cash';

// Create a new sale using the database function
export async function createSale(saleData: CreateSaleData) {
    const supabase = await createClient();

    // Validate items
    if (!saleData.items || saleData.items.length === 0) {
        return { data: null, error: 'La venta debe tener al menos un producto' };
    }

    // Call the process_sale function
    const { data, error } = await supabase.rpc('process_sale', {
        p_items: saleData.items,
        p_payment_method: saleData.payment_method,
        p_notes: saleData.notes || null,
    });

    if (error) {
        console.error('Error creating sale:', error);
        return { data: null, error: error.message };
    }

    // Get the sale total to update cash session
    const { data: saleRecord } = await supabase
        .from('sales')
        .select('total_amount, payment_method')
        .eq('id', data)
        .single();

    // Update cash session if one is open
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

    return { data: data as string, error: null };
}

// Get sales with optional filters
export async function getSales(options?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}) {
    const supabase = await createClient();

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
        .order('created_at', { ascending: false });

    if (options?.from) {
        query = query.gte('created_at', options.from);
    }

    if (options?.to) {
        query = query.lte('created_at', options.to);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching sales:', error);
        return { data: null, error: error.message };
    }

    return { data: data as Sale[], error: null };
}

// Get today's sales
export async function getTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return getSales({
        from: today.toISOString(),
        limit: 50,
    });
}

// Get sale by ID
export async function getSaleById(id: string) {
    const supabase = await createClient();

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
        .single();

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: data as Sale, error: null };
}

// Get recent sales count and total for dashboard
export async function getSalesStats() {
    const supabase = await createClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats
    const { data: todayStats } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today.toISOString());

    // Month stats
    const { data: monthStats } = await supabase
        .from('sales')
        .select('total_amount')
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
// Payment methods are exported from utils, not as server action
