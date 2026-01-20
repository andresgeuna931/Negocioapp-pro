'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ADJUSTMENT_REASONS, type AdjustmentReason } from '@/lib/constants/adjustment-reasons';

// Get products for inventory count
export async function getProductsForCount(search?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('products')
        .select('id, name, barcode, stock_on_hand, unit_type, category')
        .eq('is_active', true)
        .order('name');

    if (search) {
        query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('Error fetching products:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

// Apply inventory adjustments
export async function applyInventoryAdjustments(
    adjustments: Array<{
        productId: string;
        productName: string;
        currentStock: number;
        countedStock: number;
        difference: number;
        reason: AdjustmentReason;
        notes?: string;
    }>
) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'No autenticado' };
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const adj of adjustments) {
        // Update product stock
        const { error: updateError } = await supabase
            .from('products')
            .update({
                stock_on_hand: adj.countedStock,
                updated_at: new Date().toISOString()
            })
            .eq('id', adj.productId);

        if (updateError) {
            errors.push(`Error actualizando ${adj.productName}: ${updateError.message}`);
            continue;
        }

        // Create inventory movement record
        const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert({
                product_id: adj.productId,
                type: 'adjustment',
                qty_change: adj.difference,
                stock_before: adj.currentStock,
                stock_after: adj.countedStock,
                notes: `${ADJUSTMENT_REASONS[adj.reason]}${adj.notes ? ': ' + adj.notes : ''}`,
                created_by: user.id,
            });

        if (movementError) {
            console.error('Error creating movement:', movementError);
            // Continue anyway - the stock was updated
        }

        successCount++;
    }

    revalidatePath('/inventario');
    revalidatePath('/productos');
    revalidatePath('/stock');

    if (errors.length > 0) {
        return {
            success: false,
            error: errors.join('; '),
            adjustedCount: successCount
        };
    }

    return {
        success: true,
        adjustedCount: successCount,
        error: null
    };
}

// Get recent inventory adjustments history
export async function getAdjustmentHistory(limit: number = 20) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
            *,
            product:products(name, unit_type),
            creator:profiles!inventory_movements_created_by_fkey(full_name)
        `)
        .eq('type', 'adjustment')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching adjustment history:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}
