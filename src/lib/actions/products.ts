'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Product, ProductFormData } from '@/lib/types';
import { checkResourceLimit } from '@/lib/actions/subscription-limits';
import { getCurrentSession } from '@/lib/actions/auth';
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

export async function getProducts(options?: {
    search?: string;
    category?: string;
    activeOnly?: boolean;
    lowStockOnly?: boolean;
}) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    let query = supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

    if (options?.activeOnly !== false) {
        query = query.eq('is_active', true);
    }

    if (options?.search) {
        query = query.or(
            `name.ilike.%${options.search}%,barcode.ilike.%${options.search}%,sku.ilike.%${options.search}%`
        );
    }

    if (options?.category) {
        query = query.eq('category', options.category);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as Product[], error: null };
}

export async function getProductByBarcode(barcode: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return { data: null, error: 'Producto no encontrado' };
        return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
}

export async function getProductById(id: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Product, error: null };
}

export async function createProduct(formData: ProductFormData) {
    const session = await getCurrentSession();
    if (!session) return { data: null, error: 'No autenticado' };
    if (!hasPermission(session.profile.role, 'products:create')) {
        return { data: null, error: 'No tenés permisos para crear productos' };
    }

    const limitCheck = await checkResourceLimit('products');
    if (!limitCheck.success) {
        return { data: null, error: limitCheck.error || 'Límite alcanzado' };
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile) return { data: null, error: 'Perfil no encontrado' };

    const { data, error } = await supabase
        .from('products')
        .insert({ ...formData, tenant_id: profile.tenant_id })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            if (error.message.includes('barcode')) return { data: null, error: 'El código de barras ya existe' };
            if (error.message.includes('sku')) return { data: null, error: 'El SKU ya existe' };
        }
        return { data: null, error: error.message };
    }

    revalidatePath('/productos');
    return { data: data as Product, error: null };
}

export async function updateProduct(id: string, formData: Partial<ProductFormData>) {
    const session = await getCurrentSession();
    if (!session) return { data: null, error: 'No autenticado' };
    if (!hasPermission(session.profile.role, 'products:edit')) {
        return { data: null, error: 'No tenés permisos para editar productos' };
    }

    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const { data, error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/productos');
    return { data: data as Product, error: null };
}

export async function deleteProduct(id: string) {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'No autenticado' };
    if (!hasPermission(session.profile.role, 'products:delete')) {
        return { success: false, error: 'No tenés permisos para eliminar productos' };
    }

    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: 'No autenticado' };

    const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/productos');
    return { success: true, error: null };
}

export async function getLowStockProducts() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_low_stock_products');
    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Get categories from products table (returns unique strings)
export async function getCategories() {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: [], error: 'No autenticado' };

    const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name');

    if (error) return { data: [], error: error.message };
    return { data: data as { id: string; name: string }[], error: null };
}

// Get categories from categories table (returns full objects with id)
export async function getCategoriesFromTable() {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { data: [], error: 'No autenticado' };

    const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('tenant_id', tenantId)
        .order('name');

    if (error) return { data: [], error: error.message };
    return { data: data.map(c => c.name) as string[], error: null };
}

// Create category
export async function createCategory(name: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('categories')
        .insert({ tenant_id: tenantId, name: name.trim() });

    if (error) {
        if (error.code === '23505') return { error: 'Ya existe una categoría con ese nombre' };
        return { error: error.message };
    }

    revalidatePath('/config');
    revalidatePath('/productos');
    return { error: null };
}

// Update category
export async function updateCategory(id: string, name: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('categories')
        .update({ name: name.trim() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) {
        if (error.code === '23505') return { error: 'Ya existe una categoría con ese nombre' };
        return { error: error.message };
    }

    revalidatePath('/config');
    revalidatePath('/productos');
    return { error: null };
}

// Delete category
export async function deleteCategory(id: string) {
    const supabase = await createClient();
    const tenantId = await getTenantId();
    if (!tenantId) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) return { error: error.message };

    revalidatePath('/config');
    revalidatePath('/productos');
    return { error: null };
}

export async function adjustStock(productId: string, newStock: number, notes?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_on_hand, name')
        .eq('id', productId)
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (fetchError || !product) return { success: false, error: 'Producto no encontrado' };

    const qtyChange = newStock - product.stock_on_hand;

    const { error: updateError } = await supabase
        .from('products')
        .update({ stock_on_hand: newStock })
        .eq('id', productId)
        .eq('tenant_id', profile.tenant_id);

    if (updateError) return { success: false, error: updateError.message };

    await supabase.from('inventory_movements').insert({
        tenant_id: profile.tenant_id,
        product_id: productId,
        type: 'adjustment',
        qty_change: qtyChange,
        stock_before: product.stock_on_hand,
        stock_after: newStock,
        notes: notes || `Ajuste manual de stock: ${product.name}`,
        created_by: user.id,
    });

    revalidatePath('/productos');
    revalidatePath('/stock');
    return { success: true, error: null };
}

export async function importProducts(
    products: {
        name: string;
        barcode?: string;
        sku?: string;
        price: number;
        cost?: number;
        stock_on_hand: number;
        category?: string;
        unit_type?: 'unit' | 'kg' | 'lt';
    }[]
) {
    const limitCheck = await checkResourceLimit('products');
    if (!limitCheck.success) {
        return { success: false, error: limitCheck.error || 'Límite alcanzado', created: 0, updated: 0, errors: [] };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const p of products) {
        try {
            let existingProduct = null;

            if (p.barcode) {
                const { data } = await supabase
                    .from('products')
                    .select('id')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('barcode', p.barcode)
                    .single();
                existingProduct = data;
            } else if (p.sku) {
                const { data } = await supabase
                    .from('products')
                    .select('id')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('sku', p.sku)
                    .single();
                existingProduct = data;
            }

            if (existingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update({
                        name: p.name,
                        price: p.price,
                        cost: p.cost,
                        stock_on_hand: p.stock_on_hand,
                        category: p.category,
                        unit_type: p.unit_type || 'unit',
                        is_active: true
                    })
                    .eq('id', existingProduct.id)
                    .eq('tenant_id', profile.tenant_id);

                if (error) throw error;
                updatedCount++;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert({
                        tenant_id: profile.tenant_id,
                        name: p.name,
                        barcode: p.barcode,
                        sku: p.sku || p.barcode,
                        price: p.price,
                        cost: p.cost,
                        stock_on_hand: p.stock_on_hand,
                        category: p.category,
                        unit_type: p.unit_type || 'unit',
                        is_active: true
                    });

                if (error) throw error;
                createdCount++;
            }
        } catch (err: any) {
            errors.push(`Error en ${p.name}: ${err.message || 'Error desconocido'}`);
        }
    }

    revalidatePath('/productos');
    return {
        success: true,
        created: createdCount,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : null
    };
}
