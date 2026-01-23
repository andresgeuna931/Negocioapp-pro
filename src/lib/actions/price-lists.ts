'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PriceList {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    adjustment_type: 'percentage' | 'fixed';
    adjustment_value: number;
    is_default: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface ProductPrice {
    id: string;
    product_id: string;
    price_list_id: string;
    price: number;
}

// Get all active price lists for the current tenant
export async function getPriceLists() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching price lists:', error);
        return { data: null, error: error.message };
    }

    return { data: data as PriceList[], error: null };
}

// Get all price lists including inactive
export async function getAllPriceLists() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching price lists:', error);
        return { data: null, error: error.message };
    }

    return { data: data as PriceList[], error: null };
}

// Get the default price list
export async function getDefaultPriceList() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('is_default', true)
        .single();

    if (error) {
        console.error('Error fetching default price list:', error);
        return { data: null, error: error.message };
    }

    return { data: data as PriceList, error: null };
}

// Create a new price list
export async function createPriceList(data: {
    name: string;
    description?: string;
    adjustment_type: 'percentage' | 'fixed';
    adjustment_value: number;
    is_default?: boolean;
}) {
    const supabase = await createClient();

    // Get tenant_id from current user
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .single();

    if (!profile?.tenant_id) {
        return { data: null, error: 'No se encontró el tenant' };
    }

    const { data: newList, error } = await supabase
        .from('price_lists')
        .insert({
            tenant_id: profile.tenant_id,
            name: data.name,
            description: data.description || null,
            adjustment_type: data.adjustment_type,
            adjustment_value: data.adjustment_value,
            is_default: data.is_default || false,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating price list:', error);
        return { data: null, error: error.message };
    }

    revalidatePath('/config/precios');
    revalidatePath('/productos');
    revalidatePath('/ventas');

    return { data: newList as PriceList, error: null };
}

// Update a price list
export async function updatePriceList(
    id: string,
    data: {
        name?: string;
        description?: string;
        adjustment_type?: 'percentage' | 'fixed';
        adjustment_value?: number;
        is_default?: boolean;
        is_active?: boolean;
        sort_order?: number;
    }
) {
    const supabase = await createClient();

    const { data: updated, error } = await supabase
        .from('price_lists')
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating price list:', error);
        return { data: null, error: error.message };
    }

    revalidatePath('/config/precios');
    revalidatePath('/productos');
    revalidatePath('/ventas');

    return { data: updated as PriceList, error: null };
}

// Delete a price list
export async function deletePriceList(id: string) {
    const supabase = await createClient();

    // Check if it's the default list
    const { data: list } = await supabase
        .from('price_lists')
        .select('is_default')
        .eq('id', id)
        .single();

    if (list?.is_default) {
        return { success: false, error: 'No se puede eliminar la lista predeterminada' };
    }

    const { error } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting price list:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/config/precios');
    revalidatePath('/productos');

    return { success: true, error: null };
}

// Get prices for a specific product across all lists
export async function getProductPrices(productId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('product_prices')
        .select(`
            *,
            price_list:price_lists(id, name, is_default)
        `)
        .eq('product_id', productId);

    if (error) {
        console.error('Error fetching product prices:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

// Set prices for a product across multiple lists
export async function setProductPrices(
    productId: string,
    prices: Array<{ priceListId: string; price: number }>
) {
    const supabase = await createClient();

    // Delete existing prices for this product
    await supabase
        .from('product_prices')
        .delete()
        .eq('product_id', productId);

    // Insert new prices
    const insertData = prices.map(p => ({
        product_id: productId,
        price_list_id: p.priceListId,
        price: p.price,
    }));

    const { error } = await supabase
        .from('product_prices')
        .insert(insertData);

    if (error) {
        console.error('Error setting product prices:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/productos');
    revalidatePath('/ventas');

    return { success: true, error: null };
}

// Get the price of a product for a specific list
export async function getProductPriceForList(productId: string, priceListId: string) {
    const supabase = await createClient();

    // First try to get specific price from product_prices
    const { data: specificPrice } = await supabase
        .from('product_prices')
        .select('price')
        .eq('product_id', productId)
        .eq('price_list_id', priceListId)
        .single();

    if (specificPrice) {
        return { price: Number(specificPrice.price), error: null };
    }

    // If no specific price, calculate from base price and adjustment
    const { data: product } = await supabase
        .from('products')
        .select('sale_price')
        .eq('id', productId)
        .single();

    const { data: priceList } = await supabase
        .from('price_lists')
        .select('adjustment_type, adjustment_value')
        .eq('id', priceListId)
        .single();

    if (!product || !priceList) {
        return { price: null, error: 'Producto o lista no encontrada' };
    }

    const basePrice = Number(product.sale_price);
    let finalPrice = basePrice;

    if (priceList.adjustment_type === 'percentage') {
        finalPrice = basePrice * (1 + Number(priceList.adjustment_value) / 100);
    } else {
        finalPrice = basePrice + Number(priceList.adjustment_value);
    }

    return { price: Math.round(finalPrice * 100) / 100, error: null };
}
