'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';

const PLAN_PRICES: Record<string, number> = {
    starter: 19000,
    professional: 39000,
    business: 49000,
    professional_annual: 32500, // equivalente mensual
    business_annual: 40833,
};

// Calcula el % de comisión según nivel (para vendedores estándar)
function getCommissionLevel(activeClients: number): number {
    if (activeClients >= 30) return 30;
    if (activeClients >= 20) return 27;
    if (activeClients >= 10) return 24;
    return 20;
}

// Calcula el umbral de referidos activo según los escalones definidos
function getReferralThreshold(networkActiveClients: number): number {
    if (networkActiveClients >= 50) return 50;
    if (networkActiveClients >= 30) return 30;
    if (networkActiveClients >= 20) return 20;
    if (networkActiveClients >= 10) return 10;
    return 0;
}

// Porcentaje de comisión de red según el umbral alcanzado
function getReferralPct(threshold: number): number {
    if (threshold >= 50) return 0.12;
    if (threshold >= 30) return 0.09;
    if (threshold >= 20) return 0.07;
    if (threshold >= 10) return 0.05;
    return 0;
}

// Determina si un negocio ya superó los 15 días de prueba
// Usa trial_ends_at si existe, sino created_at + 15 días
function isBusinessActive(tenant: any): boolean {
    if (tenant.subscription_status !== 'active') return false;
    return true; // subscription_status 'active' ya implica que superó el trial
}

// Fecha en que el negocio se considera "activo" para comisiones
// = trial_ends_at OR created_at + 15 días
function getActivationDate(tenant: any): Date {
    if (tenant.trial_ends_at) return new Date(tenant.trial_ends_at);
    const created = new Date(tenant.created_at);
    created.setDate(created.getDate() + 15);
    return created;
}

// Fecha estimada de pago al vendedor (1ro del mes siguiente a la activación)
function getPaymentDate(activationDate: Date): Date {
    return new Date(activationDate.getFullYear(), activationDate.getMonth() + 1, 1);
}

// --- Vendedores ---

export async function getSellers() {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: sellers, error: sellersError } = await admin
        .from('sellers')
        .select('*')
        .order('created_at', { ascending: false });

    if (sellersError) return { error: sellersError.message };
    if (!sellers || sellers.length === 0) return { sellers: [] };

    const { data: assignments } = await admin
        .from('seller_assignments')
        .select(`
            id,
            seller_id,
            assigned_at,
            tenant_id,
            tenants (
                id,
                name,
                plan_type,
                subscription_status,
                trial_ends_at,
                created_at
            )
        `);

    const sellersWithAssignments = sellers.map((seller: any) => {
        const sellerAssignments = (assignments ?? [])
            .filter((a: any) => a.seller_id === seller.id)
            .map((a: any) => {
                const t = a.tenants as any;
                const activationDate = t ? getActivationDate(t) : null;
                const paymentDate = activationDate ? getPaymentDate(activationDate) : null;
                return {
                    id: a.id,
                    assigned_at: a.assigned_at,
                    activation_date: activationDate?.toISOString() ?? null,
                    payment_date: paymentDate?.toISOString() ?? null,
                    tenant: {
                        id: a.tenant_id,
                        business_name: t?.name ?? '',
                        plan_type: t?.plan_type ?? '',
                        subscription_status: t?.subscription_status ?? '',
                        subscriptions: t ? [{ plan_id: t.plan_type, status: t.subscription_status }] : [],
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
    const commission_fixed = formData.get('commission_fixed') === 'true';
    const referred_by = (formData.get('referred_by') as string) || null;

    // Si es fijo, usa el pct ingresado; si es estándar, arranca en 20 (se recalcula dinámicamente)
    const commission_pct = commission_fixed
        ? Number(formData.get('commission_pct') ?? 20)
        : 20;

    if (!full_name || !email) return { error: 'Nombre y email son requeridos' };

    const { error } = await admin.from('sellers').insert({
        full_name,
        email,
        commission_pct,
        commission_fixed,
        referred_by: referred_by || null,
    });
    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

export async function updateSeller(sellerId: string, data: {
    commission_pct?: number;
    commission_fixed?: boolean;
    referred_by?: string | null;
}) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from('sellers')
        .update(data)
        .eq('id', sellerId);

    if (error) return { error: error.message };

    revalidatePath('/admin/vendedores');
    return { success: true };
}

// Mantenemos compatibilidad con el nombre anterior
export async function updateSellerCommission(sellerId: string, commission_pct: number) {
    return updateSeller(sellerId, { commission_pct });
}

export async function toggleSellerActive(sellerId: string, newStatus: boolean) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from('sellers')
        .update({ is_active: newStatus })
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

export async function assignTenantToSeller(sellerId: string, tenantId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin.from('seller_assignments').insert({
        seller_id: sellerId,
        tenant_id: tenantId,
    });
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
        month,
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

    const { data: allTenants } = await admin
        .from('tenants')
        .select('id, name')
        .order('name');

    const { data: assigned } = await admin
        .from('seller_assignments')
        .select('tenant_id');

    const assignedIds = new Set((assigned ?? []).map((a: any) => a.tenant_id));
    const unassigned = (allTenants ?? [])
        .filter((t: any) => !assignedIds.has(t.id))
        .map((t: any) => ({ id: t.id, business_name: t.name }));

    return { tenants: unassigned };
}

// --- Resumen de comisiones para el panel admin ---

export async function getTotalMonthlyCommissions() {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: sellers } = await admin
        .from('sellers')
        .select('id, full_name, commission_pct, commission_fixed, is_active, referred_by');

    if (!sellers || sellers.length === 0) return { totalCommissions: 0, sellerBreakdown: [] };

    const { data: assignments } = await admin
        .from('seller_assignments')
        .select('seller_id, tenant_id, tenants(plan_type, subscription_status, trial_ends_at, created_at)');

    // Construir mapa de negocios activos por vendedor
    const activeBySeller: Record<string, { count: number; revenue: number }> = {};

    for (const seller of sellers) {
        const sellerAssignments = (assignments ?? []).filter((a: any) => a.seller_id === seller.id);
        let count = 0;
        let revenue = 0;
        for (const a of sellerAssignments) {
            const t = a.tenants as any;
            if (!t || !isBusinessActive(t)) continue;
            count++;
            revenue += PLAN_PRICES[t.plan_type] ?? 0;
        }
        activeBySeller[seller.id] = { count, revenue };
    }

    const sellerBreakdown = sellers
        .filter((s: any) => s.is_active)
        .map((seller: any) => {
            const { count: activeClients, revenue: activeRevenue } = activeBySeller[seller.id] ?? { count: 0, revenue: 0 };

            // Comisión directa
            const effectivePct = seller.commission_fixed
                ? seller.commission_pct
                : getCommissionLevel(activeClients);
            const directCommission = Math.round(activeRevenue * (effectivePct / 100));

            // Comisión de referidos
            // Buscar todos los vendedores que tienen referred_by = este seller
            const referredSellers = sellers.filter((s: any) => s.referred_by === seller.id);
            const networkActiveClients = referredSellers.reduce((acc: number, s: any) => {
                return acc + (activeBySeller[s.id]?.count ?? 0);
            }, 0);
            const networkRevenue = referredSellers.reduce((acc: number, s: any) => {
                return acc + (activeBySeller[s.id]?.revenue ?? 0);
            }, 0);

            const threshold = getReferralThreshold(networkActiveClients);
            const refPct = getReferralPct(threshold);
            const referralCommission = threshold >= 10
                ? Math.round((networkRevenue * threshold / Math.max(networkActiveClients, 1)) * refPct)
                : 0;

            const totalCommission = directCommission + referralCommission;

            return {
                sellerId: seller.id,
                fullName: seller.full_name,
                commissionPct: effectivePct,
                commissionFixed: seller.commission_fixed,
                activeClients,
                activeRevenue,
                directCommission,
                referredSellersCount: referredSellers.length,
                networkActiveClients,
                networkRevenue,
                referralThreshold: threshold,
                referralCommission,
                commission: totalCommission,
            };
        });

    const totalCommissions = sellerBreakdown.reduce((acc: number, s: any) => acc + s.commission, 0);
    return { totalCommissions, sellerBreakdown };
}
