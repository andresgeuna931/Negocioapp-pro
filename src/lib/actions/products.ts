'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Product, ProductFormData } from '@/lib/types';
import { checkResourceLimit } from '@/lib/actions/subscription-limits';
import { getCurrentSession } from '@/lib/actions/auth';
import { hasPermission } from '@/lib/permissions';

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

// Get all products for current tenant
export async function getProducts(options?: {
    search?: string;
    category?: string;
    activeOnly?: boolean;
    lowStockOnly?: boolean;
}) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    let query = supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: data as Product, error: null };
}

// Create new product
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
    const user = session.user;

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
    const session = await getCurrentSession();
    if (!session) return { data: null, error: 'No autenticado' };
    if (!hasPermission(session.profile.role, 'products:edit')) {
        return { data: null, error: 'No tenés permisos para editar productos' };
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) return { data: null, error: 'Tenant no encontrado' };

    const { data, error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)  // CRITICAL: Filter by tenant
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

// Delete product (soft delete)
export async function deleteProduct(id: string) {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'No autenticado' };
    if (!hasPermission(session.profile.role, 'products:delete')) {
        return { success: false, error: 'No tenés permisos para eliminar productos' };
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: 'Tenant no encontrado' };

    const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);  // CRITICAL: Filter by tenant

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

// Get categories for current tenant
export async function getCategories() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: [], error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .order('name');

    if (error) {
        return { data: [] as { id: string; name: string }[], error: error.message };
    }

    return { data: data as { id: string; name: string }[], error: null };
}

// Create category (owner only)
export async function createCategory(name: string) {
    const session = await getCurrentSession();
    if (!session) return { data: null, error: 'No autenticado' };
    if (session.profile.role !== 'owner') return { data: null, error: 'Solo el dueño puede crear categorías' };

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    const { data, error } = await supabase
        .from('categories')
        .insert({ name: name.trim(), tenant_id: profile?.tenant_id })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return { data: null, error: 'Ya existe una categoría con ese nombre' };
        return { data: null, error: error.message };
    }

    revalidatePath('/config');
    revalidatePath('/productos');
    return { data, error: null };
}

// Update category (owner only)
export async function updateCategory(id: string, name: string) {
    const session = await getCurrentSession();
    if (!session) return { data: null, error: 'No autenticado' };
    if (session.profile.role !== 'owner') return { data: null, error: 'Solo el dueño puede editar categorías' };

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) return { data: null, error: 'Tenant no encontrado' };

    const { data, error } = await supabase
        .from('categories')
        .update({ name: name.trim() })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)  // CRITICAL: Filter by tenant
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return { data: null, error: 'Ya existe una categoría con ese nombre' };
        return { data: null, error: error.message };
    }

    revalidatePath('/config');
    revalidatePath('/productos');
    return { data, error: null };
}

// Delete category (owner only)
export async function deleteCategory(id: string) {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'No autenticado' };
    if (session.profile.role !== 'owner') return { success: false, error: 'Solo el dueño puede eliminar categorías' };

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: 'Tenant no encontrado' };

    // Quitar categoría de productos que la usan - scoped to tenant
    const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)  // CRITICAL: Filter by tenant
        .single();

    if (category) {
        await supabase
            .from('products')
            .update({ category: null })
            .eq('category', category.name)
            .eq('tenant_id', profile.tenant_id);  // CRITICAL: Filter by tenant
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);  // CRITICAL: Filter by tenant

    if (error) return { success: false, error: error.message };

    revalidatePath('/config');
    revalidatePath('/productos');
    return { success: true, error: null };
}

// Seed categories for new tenant based on business type
export async function seedCategories(tenantId: string, businessType: string) {
    const supabase = await createClient();

    const categoryMap: Record<string, string[]> = {
        kiosco: ['Golosinas', 'Chocolates y alfajores', 'Chicles y caramelos', 'Snacks y frituras', 'Bebidas con alcohol', 'Bebidas sin alcohol', 'Aguas y jugos', 'Infusiones', 'Cigarrillos y tabaco', 'Lácteos y fiambres', 'Panificados', 'Enlatados y conservas', 'Condimentos', 'Higiene personal', 'Artículos de limpieza', 'Pilas y accesorios', 'Varios'],
        libreria: ['Útiles escolares', 'Cuadernos y carpetas', 'Lapiceras y bolígrafos', 'Lápices y colores', 'Pinturas y marcadores', 'Papel y cartulina', 'Arte y manualidades', 'Mochilas y cartucheras', 'Libros', 'Juguetes didácticos', 'Tecnología escolar', 'Sellados y formularios', 'Varios'],
        ferreteria: ['Herramientas manuales', 'Herramientas eléctricas', 'Tornillería y bulonería', 'Pinturas y barnices', 'Plomería y sanitarios', 'Electricidad e iluminación', 'Materiales de construcción', 'Adhesivos y selladores', 'Cerrajería', 'Seguridad', 'Jardín y exterior', 'Varios'],
        veterinaria: ['Alimentos perros', 'Alimentos gatos', 'Alimentos otras mascotas', 'Antiparasitarios externos', 'Antiparasitarios internos', 'Medicamentos', 'Vacunas', 'Accesorios perros', 'Accesorios gatos', 'Juguetes', 'Higiene y grooming', 'Jaulas y transportes', 'Servicios', 'Varios'],
        verduleria: ['Verduras de hoja', 'Tubérculos y raíces', 'Frutas tropicales', 'Frutas de estación', 'Cítricos', 'Hierbas aromáticas', 'Legumbres secas', 'Huevos', 'Productos orgánicos', 'Varios'],
        carniceria: ['Vacuno', 'Cerdo', 'Pollo', 'Cordero y chivito', 'Embutidos', 'Achuras y menudencias', 'Fiambres', 'Marinados y preparados', 'Varios'],
        limpieza: ['Limpieza del hogar', 'Limpieza de ropa', 'Desinfectantes', 'Higiene personal', 'Papelería descartable', 'Accesorios de limpieza', 'Fragancias y ambientadores', 'Varios'],
        dietetica: ['Cereales y granos', 'Legumbres', 'Frutos secos y semillas', 'Harinas alternativas', 'Endulzantes naturales', 'Aceites y aderezos', 'Infusiones y tés', 'Suplementos y vitaminas', 'Proteínas y deportivos', 'Snacks saludables', 'Productos veganos', 'Cosmética natural', 'Varios'],
        jardineria: ['Plantas de interior', 'Plantas de exterior', 'Plantas aromáticas', 'Cactus y suculentas', 'Árboles y arbustos', 'Semillas', 'Tierra y sustratos', 'Macetas y contenedores', 'Fertilizantes', 'Pesticidas y herbicidas', 'Herramientas de jardín', 'Riego', 'Varios'],
        imprenta: ['Fotocopias', 'Impresiones', 'Anillados y encuadernados', 'Laminados', 'Ploteos y planos', 'Diseño gráfico', 'Sellados', 'Papelería', 'Insumos de impresión', 'Servicios digitales', 'Varios'],
        otro: ['Productos', 'Servicios', 'Varios'],
    };

    const categories = categoryMap[businessType] || categoryMap['otro'];
    const rows = categories.map(name => ({ tenant_id: tenantId, name }));
    await supabase.from('categories').insert(rows);
}

// Update stock manually (adjustment)
export async function adjustStock(
    productId: string,
    newStock: number,
    notes?: string
) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    // Get current stock - verify product belongs to this tenant
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_on_hand, name')
        .eq('id', productId)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (fetchError || !product) {
        return { success: false, error: 'Producto no encontrado' };
    }

    const qtyChange = newStock - product.stock_on_hand;

    // Update stock - also filtered by tenant for extra safety
    const { error: updateError } = await supabase
        .from('products')
        .update({ stock_on_hand: newStock })
        .eq('id', productId)
        .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    await supabase.from('inventory_movements').insert({
        tenant_id: tenantId,
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

// Bulk import products
export async function importProducts(
    products: {
        name: string;
        barcode?: string;
        sku?: string;
        price: number;
        cost?: number;
        stock_on_hand: number;
        category?: string;
        unit_type?: 'unit' | 'kg' | 'g' | 'lt' | 'ml';
    }[]
) {
    const limitCheck = await checkResourceLimit('products');
    if (!limitCheck.success) {
        return { success: false, error: limitCheck.error || 'Límite alcanzado', created: 0, updated: 0, errors: [] };
    }

    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    let createdCount = 0;
    let updatedCount = 0;
    let errors: string[] = [];

    // Process in batches
    for (const p of products) {
        try {
            // Check if product exists (by barcode OR sku) - always filtered by tenant
            let existingProduct = null;

            if (p.barcode) {
                const { data } = await supabase
                    .from('products')
                    .select('id')
                    .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
                    .eq('barcode', p.barcode)
                    .single();
                existingProduct = data;
            } else if (p.sku) {
                const { data } = await supabase
                    .from('products')
                    .select('id')
                    .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
                    .eq('sku', p.sku)
                    .single();
                existingProduct = data;
            }

            if (existingProduct) {
                // Update - filtered by tenant for safety
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
                    .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant

                if (error) throw error;
                updatedCount++;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert({
                        tenant_id: tenantId,
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
            console.error('Error importing product:', p.name, err);
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
// Get categories from categories table
export async function getCategoriesFromTable() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: [], error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .order('name');

    if (error) {
        return { data: [], error: error.message };
    }

    return { data: data.map(c => c.name) as string[], error: null };
}
