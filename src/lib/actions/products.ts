'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Product, ProductFormData } from '@/lib/types';

// Get all products for current tenant
export async function getProducts(options?: {
    search?: string;
    category?: string;
    activeOnly?: boolean;
    lowStockOnly?: boolean;
}) {
    const supabase = await createClient();

    let query = supabase
        .from('products')
        .select('*')
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

    if (error) {
        console.error('Error fetching products:', error);
        return { data: null, error: error.message };
    }

    return { data: data as Product[], error: null };
}

// Get product by barcode
export async function getProductByBarcode(barcode: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return { data: null, error: 'Producto no encontrado' };
        }
        return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
}

// Get product by ID
export async function getProductById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
}

// Create new product
export async function createProduct(formData: ProductFormData) {
    const supabase = await createClient();

    // Get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        return { data: null, error: 'Perfil no encontrado' };
    }

    const { data, error } = await supabase
        .from('products')
        .insert({
            ...formData,
            tenant_id: profile.tenant_id,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
        if (error.code === '23505') {
            if (error.message.includes('barcode')) {
                return { data: null, error: 'El código de barras ya existe' };
            }
            if (error.message.includes('sku')) {
                return { data: null, error: 'El SKU ya existe' };
            }
        }
        return { data: null, error: error.message };
    }

    revalidatePath('/productos');
    return { data: data as Product, error: null };
}

// Update product
export async function updateProduct(id: string, formData: Partial<ProductFormData>) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating product:', error);
        return { data: null, error: error.message };
    }

    revalidatePath('/productos');
    revalidatePath(`/productos/${id}`);
    return { data: data as Product, error: null };
}

// Delete product (soft delete - set is_active to false)
export async function deleteProduct(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/productos');
    return { success: true, error: null };
}

// Get low stock products
export async function getLowStockProducts() {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_low_stock_products');

    if (error) {
        console.error('Error fetching low stock:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

// Get product categories
export async function getCategories() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);

    if (error) {
        return { data: [], error: error.message };
    }

    // Get unique categories
    const categories = [...new Set(data.map((p) => p.category).filter(Boolean))];
    return { data: categories as string[], error: null };
}

// Update stock manually (adjustment)
export async function adjustStock(
    productId: string,
    newStock: number,
    notes?: string
) {
    const supabase = await createClient();

    // Get current stock
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_on_hand, name')
        .eq('id', productId)
        .single();

    if (fetchError || !product) {
        return { success: false, error: 'Producto no encontrado' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

    if (!profile) {
        return { success: false, error: 'Perfil no encontrado' };
    }

    const qtyChange = newStock - product.stock_on_hand;

    // Update stock
    const { error: updateError } = await supabase
        .from('products')
        .update({ stock_on_hand: newStock })
        .eq('id', productId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    // Create inventory movement
    await supabase.from('inventory_movements').insert({
        tenant_id: profile.tenant_id,
        product_id: productId,
        type: 'adjustment',
        qty_change: qtyChange,
        stock_before: product.stock_on_hand,
        stock_after: newStock,
        notes: notes || `Ajuste manual de stock: ${product.name}`,
        created_by: user?.id,
    });

    revalidatePath('/productos');
    revalidatePath('/stock');
    return { success: true, error: null };
}
