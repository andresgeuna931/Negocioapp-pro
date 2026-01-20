'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Get all unique categories
export async function getCategories() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);

    if (error) {
        console.error('Error fetching categories:', error);
        return { data: [], error: error.message };
    }

    // Get unique categories
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))] as string[];

    return { data: categories.sort(), error: null };
}

// Preview price increase by percentage
export async function previewPriceIncrease(
    percentage: number,
    category?: string
) {
    const supabase = await createClient();

    let query = supabase
        .from('products')
        .select('id, name, price, category, barcode')
        .eq('is_active', true);

    if (category) {
        query = query.eq('category', category);
    }

    const { data, error } = await query.order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return { data: null, error: error.message };
    }

    // Calculate new prices
    const preview = data.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        barcode: product.barcode,
        currentPrice: Number(product.price),
        newPrice: Math.round(Number(product.price) * (1 + percentage / 100)),
        increase: percentage,
    }));

    return { data: preview, error: null };
}

// Apply price increase by percentage
export async function applyPriceIncrease(
    percentage: number,
    category?: string
) {
    const supabase = await createClient();

    // Get products to update
    let query = supabase
        .from('products')
        .select('id, price')
        .eq('is_active', true);

    if (category) {
        query = query.eq('category', category);
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError || !products) {
        return { success: false, error: fetchError?.message || 'Error al obtener productos' };
    }

    // Update each product with new price
    let updatedCount = 0;
    for (const product of products) {
        const newPrice = Math.round(Number(product.price) * (1 + percentage / 100));

        const { error: updateError } = await supabase
            .from('products')
            .update({ price: newPrice, updated_at: new Date().toISOString() })
            .eq('id', product.id);

        if (!updateError) {
            updatedCount++;
        }
    }

    revalidatePath('/productos');
    revalidatePath('/productos/precios');

    return {
        success: true,
        updatedCount,
        error: null
    };
}

// Preview import from Excel data
export async function previewExcelImport(
    items: { barcode: string; price: number }[]
) {
    const supabase = await createClient();

    // Get all products with barcodes
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, barcode, category')
        .eq('is_active', true)
        .not('barcode', 'is', null);

    if (error) {
        return { data: null, error: error.message };
    }

    // Match items with products
    const matched: Array<{
        id: string;
        name: string;
        category: string | null;
        barcode: string;
        currentPrice: number;
        newPrice: number;
        increase: number;
    }> = [];

    const notFound: string[] = [];

    for (const item of items) {
        const product = products.find(p => p.barcode === item.barcode);

        if (product) {
            const currentPrice = Number(product.price);
            const newPrice = item.price;
            const increase = currentPrice > 0
                ? Math.round((newPrice - currentPrice) / currentPrice * 100)
                : 0;

            matched.push({
                id: product.id,
                name: product.name,
                category: product.category,
                barcode: item.barcode,
                currentPrice,
                newPrice,
                increase,
            });
        } else {
            notFound.push(item.barcode);
        }
    }

    return {
        data: {
            matched,
            notFound,
            totalInFile: items.length,
            matchedCount: matched.length,
        },
        error: null
    };
}

// Apply import from Excel data
export async function applyExcelImport(
    items: { barcode: string; price: number }[]
) {
    const supabase = await createClient();

    // Get all products with barcodes
    const { data: products, error } = await supabase
        .from('products')
        .select('id, barcode')
        .eq('is_active', true)
        .not('barcode', 'is', null);

    if (error) {
        return { success: false, error: error.message, updatedCount: 0 };
    }

    let updatedCount = 0;
    for (const item of items) {
        const product = products.find(p => p.barcode === item.barcode);

        if (product) {
            const { error: updateError } = await supabase
                .from('products')
                .update({ price: item.price, updated_at: new Date().toISOString() })
                .eq('id', product.id);

            if (!updateError) {
                updatedCount++;
            }
        }
    }

    revalidatePath('/productos');
    revalidatePath('/productos/precios');

    return {
        success: true,
        updatedCount,
        error: null
    };
}
