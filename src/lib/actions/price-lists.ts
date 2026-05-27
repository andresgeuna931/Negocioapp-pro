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

export async function getPriceLists() {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as PriceList[], error: null };
}

export async function getAllPriceLists() {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as PriceList[], error: null };
}

export async function getDefaultPriceList() {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PriceList, error: null };
}

export async function createPriceList(data: {
    name: string;
    description?: string;
    adjustment_type: 'percentage' | 'fixed';
    adjustment_value: number;
    is_default?: boolean;
}) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

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

    if (error) return { data: null, error: error.message };

    revalidatePath('/config/precios');
    revalidatePath('/productos');
    revalidatePath('/ventas');

    return { data: newList as PriceList, error: null };
}

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
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data: updated, error } = await supabase
        .from('price_lists')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/config/precios');
    revalidatePath('/productos');
    revalidatePath('/ventas');

    return { data: updated as PriceList, error: null };
}

export async function deletePriceList(id: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: 'No autenticado' };

    const { data: list } = await supabase
        .from('price_lists')
        .select('is_default')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

    if (list?.is_default) {
        return { success: false, error: 'No se puede eliminar la lista predeterminada' };
    }

    const { error } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/config/precios');
    revalidatePath('/productos');

    return { success: true, error: null };
}

export async function getProductPrices(productId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('product_prices')
        .select(`*, price_list:price_lists(id, name, is_default)`)
        .eq('product_id', productId);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function setProductPrices(
    productId: string,
    prices: Array<{ priceListId: string; price: number }>
) {
    const supabase = await createClient();

    await supabase
        .from('product_prices')
        .delete()
        .eq('product_id', productId);

    const insertData = prices.map(p => ({
        product_id: productId,
        price_list_id: p.priceListId,
        price: p.price,
    }));

    const { error } = await supabase
        .from('product_prices')
        .insert(insertData);

    if (error) return { success: false, error: error.message };

    revalidatePath('/productos');
    revalidatePath('/ventas');

    return { success: true, error: null };
}

export async function getProductPriceForList(productId: string, priceListId: string) {
    const supabase = await createClient();

    const { data: specificPrice } = await supabase
        .from('product_prices')
        .select('price')
        .eq('product_id', productId)
        .eq('price_list_id', priceListId)
        .single();

    if (specificPrice) {
        return { price: Number(specificPrice.price), error: null };
    }

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
