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

// Get all active price lists for the current tenant
export async function getPriceLists() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching price lists:', error);
        return { data: null, error: error.message };
    }

    return { data: data as PriceList[], error: null };
}

// Get the default price list
export async function getDefaultPriceList() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data: newList, error } = await supabase
        .from('price_lists')
        .insert({
            tenant_id: tenantId,
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data: updated, error } = await supabase
        .from('price_lists')
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    // Check if it's the default list - also verify tenant
    const { data: list } = await supabase
        .from('price_lists')
        .select('is_default')
        .eq('id', id)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (!list) {
        return { success: false, error: 'Lista de precios no encontrada' };
    }

    if (list.is_default) {
        return { success: false, error: 'No se puede eliminar la lista predeterminada' };
    }

    const { error } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant

    if (error) {
        console.error('Error deleting price list:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/config/precios');
    revalidatePath('/productos');

    return { success: true, error: null };
}

// Get prices for a specific product across all lists
// Note: product_prices are scoped via price_list which is scoped to tenant
export async function getProductPrices(productId: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    // First verify the product belongs to this tenant
    const { data: productCheck } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('tenant_id', tenantId)  // CRITICAL: Verify product belongs to tenant
        .single();

    if (!productCheck) {
        return { data: null, error: 'Producto no encontrado' };
    }

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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    // Verify the product belongs to this tenant
    const { data: productCheck } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('tenant_id', tenantId)  // CRITICAL: Verify product belongs to tenant
        .single();

    if (!productCheck) {
        return { success: false, error: 'Producto no encontrado' };
    }

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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { price: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

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
    // Verify product belongs to tenant
    const { data: product } = await supabase
        .from('products')
        .select('sale_price')
        .eq('id', productId)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    // Verify price list belongs to tenant
    const { data: priceList } = await supabase
        .from('price_lists')
        .select('adjustment_type, adjustment_value')
        .eq('id', priceListId)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
