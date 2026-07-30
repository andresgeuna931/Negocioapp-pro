'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { hasPermission } from '@/lib/permissions';

async function getCurrentUserContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return null;
    return { supabase, user, tenantId: profile.tenant_id, role: profile.role };
}

export async function getCategories() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: [], error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('category', 'is', null);

    if (error) {
        console.error('Error fetching categories:', error);
        return { data: [], error: error.message };
    }

    const categories = [...new Set(data.map(p => p.category).filter(Boolean))] as string[];
    return { data: categories.sort(), error: null };
}

export async function previewPriceIncrease(percentage: number, category?: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId, role } = ctx;

    if (!hasPermission(role, 'products:edit')) {
        return { data: null, error: 'No tenés permiso para modificar precios' };
    }

    let query = supabase
        .from('products')
        .select('id, name, price, category, barcode')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    if (category) query = query.eq('category', category);

    const { data, error } = await query.order('name');
    if (error) return { data: null, error: error.message };

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

export async function applyPriceIncrease(percentage: number, category?: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autenticado' };
    const { supabase, tenantId, role } = ctx;

    if (!hasPermission(role, 'products:edit')) {
        return { success: false, error: 'No tenés permiso para modificar precios' };
    }

    let query = supabase
        .from('products')
        .select('id, price')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    if (category) query = query.eq('category', category);

    const { data: products, error: fetchError } = await query;
    if (fetchError || !products) return { success: false, error: fetchError?.message || 'Error al obtener productos' };

    let updatedCount = 0;
    for (const product of products) {
        const newPrice = Math.round(Number(product.price) * (1 + percentage / 100));
        const { error: updateError } = await supabase
            .from('products')
            .update({ price: newPrice, updated_at: new Date().toISOString() })
            .eq('id', product.id)
            .eq('tenant_id', tenantId);

        if (!updateError) updatedCount++;
    }

    revalidatePath('/productos');
    revalidatePath('/productos/precios');
    return { success: true, updatedCount, error: null };
}

export async function previewExcelImport(items: { barcode: string; price: number }[]) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId, role } = ctx;

    if (!hasPermission(role, 'products:edit')) {
        return { data: null, error: 'No tenés permiso para modificar precios' };
    }

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, barcode, category')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('barcode', 'is', null);

    if (error) return { data: null, error: error.message };

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
            matched.push({ id: product.id, name: product.name, category: product.category, barcode: item.barcode, currentPrice, newPrice, increase });
        } else {
            notFound.push(item.barcode);
        }
    }

    return { data: { matched, notFound, totalInFile: items.length, matchedCount: matched.length }, error: null };
}

export async function applyExcelImport(items: { barcode: string; price: number }[]) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autenticado', updatedCount: 0 };
    const { supabase, tenantId, role } = ctx;

    if (!hasPermission(role, 'products:edit')) {
        return { success: false, error: 'No tenés permiso para modificar precios', updatedCount: 0 };
    }

    const { data: products, error } = await supabase
        .from('products')
        .select('id, barcode')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('barcode', 'is', null);

    if (error) return { success: false, error: error.message, updatedCount: 0 };

    let updatedCount = 0;
    for (const item of items) {
        const product = products.find(p => p.barcode === item.barcode);
        if (product) {
            const { error: updateError } = await supabase
                .from('products')
                .update({ price: item.price, updated_at: new Date().toISOString() })
                .eq('id', product.id)
                .eq('tenant_id', tenantId);

            if (!updateError) updatedCount++;
        }
    }

    revalidatePath('/productos');
    revalidatePath('/productos/precios');
    return { success: true, updatedCount, error: null };
}
