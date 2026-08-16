'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';

// --- Vendedores ---

export async function getSellers() {
    await requireAdmin();
    const admin = createAdminClient();

    // Query 1: sellers
    const { data: sellers, error: sellersError } = await admin
        .from('sellers')
        .select('*')
        .order('created_at', { ascending: false });

    if (sellersError) return { error: sellersError.message };
    if (!sellers || sellers.length === 0) return { sellers: [] };

    // Query 2: assignments con tenant
    const { data: assignments } = await admin
        .from('seller_assignments')
        .select(`
            id,
            seller_id,
            assigned_at,
            tenant_id,
            tenants (
                id,
                business_name
            )
        `);

    // Query 3: subscriptions de los tenants asignados
    const tenantIds = (assignments ?? []).map((a: any) => a.tenant_id);
    let subscriptions: any[] = [];
    if (tenantIds.length > 0) {
        const { data: subs } = await admin
            .from('subscriptions')
            .select('tenant_id, plan_id, status')
            .in('tenant_id', tenantIds);
        subscriptions = subs ?? [];
    }

    // Merge
    const sellersWithAssignments = sellers.map((seller: any) => {
        const sellerAssignments = (assignments ?? [])
            .filter((a: any) => a.seller_id === seller.id)
            .map((a: any) => {
                const sub = subscriptions.find((s: any) => s.tenant_id === a.tenant_id);
                return {
                    id: a.id,
                    assigned_at: a.assigned_at,
                    tenant: {
                        id: a.tenant_id,
                        business_name: (a.tenants as any)?.business_name ?? '',
                        subscriptions: sub ? [{ plan_id: sub.plan_id, status: sub.status }] : [],
                    },
                };
            });
        return { ...seller, seller_assignments: sellerAssignments };
    });

    return { sellers: sellersWithAssignments };
}

export async function createSeller(formData: FormData) {
    await requireAdmin();
    const admin = createAdminClient();

    const full_name = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const commission_pct = Number(formData.get('commission_pct') ?? 20);

    if (!full_name || !email) return { error: 'Nombre y email son requeridos' };

    const { error } = await admin.from('sellers').insert({ full_name, email, commission_pct });
    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

export async function updateSellerCommission(sellerId: string, commission_pct: number) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from('sellers')
        .update({ commission_pct })
        .eq('id', sellerId);

    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

export async function toggleSellerActive(sellerId: string, is_active: boolean) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from('sellers')
        .update({ is_active })
        .eq('id', sellerId);

    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

export async function deleteSeller(sellerId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin.from('sellers').delete().eq('id', sellerId);
    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

// --- Asignaciones ---

export async function assignTenantToSeller(sellerId: string, tenantId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    // Verificar que el tenant no esté ya asignado a otro vendedor
    const { data: existing } = await admin
        .from('seller_assignments')
        .select('id, seller_id')
        .eq('tenant_id', tenantId)
        .single();

    if (existing) return { error: 'Este negocio ya está asignado a otro vendedor' };

    const { error } = await admin
        .from('seller_assignments')
        .insert({ seller_id: sellerId, tenant_id: tenantId });

    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

export async function removeAssignment(assignmentId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from('seller_assignments')
        .delete()
        .eq('id', assignmentId);

    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

// --- Pagos ---

export async function recordCommissionPayment(sellerId: string, amount: number, month: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin.from('commission_payments').insert({
        seller_id: sellerId,
        amount,
        month, // formato 'YYYY-MM'
        paid_at: new Date().toISOString(),
    });

    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

export async function getCommissionPayments(sellerId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('commission_payments')
        .select('*')
        .eq('seller_id', sellerId)
        .order('paid_at', { ascending: false });

    if (error) return { error: error.message };
    return { payments: data };
}

// --- Tenants sin asignar ---

export async function getUnassignedTenants() {
    await requireAdmin();
    const admin = createAdminClient();

    // Todos los tenants
    const { data: allTenants } = await admin
        .from('tenants')
        .select('id, business_name')
        .order('business_name');

    // Tenants ya asignados
    const { data: assigned } = await admin
        .from('seller_assignments')
        .select('tenant_id');

    const assignedIds = new Set((assigned ?? []).map((a: any) => a.tenant_id));
    const unassigned = (allTenants ?? []).filter((t: any) => !assignedIds.has(t.id));

    return { tenants: unassigned };
}
