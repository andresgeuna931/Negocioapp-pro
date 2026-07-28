'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from './auth';
import { getPlanDetails } from '@/lib/config/plans';

export async function getAdminMetrics() {
    await requireAdmin();
    const supabase = createAdminClient();

    const [tenantsCount, usersCount, activeTenantsData] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id, plan_type, settings').eq('status', 'active'),
    ]);

    // Calcular ingresos reales sumando precio de cada plan activo
    const activeTenants = activeTenantsData.data || [];
    const revenueEstimate = activeTenants.reduce((total, tenant) => {
        const settings = tenant.settings as any;
        const planId = settings?.plan_id || tenant.plan_type || 'starter';
        const plan = getPlanDetails(planId);
        // Para planes anuales dividimos por 12 para mostrar equivalente mensual
        const monthlyPrice = plan.billing === 'annual'
            ? Math.round((plan as any).monthlyEquivalent || plan.price / 12)
            : plan.price;
        return total + monthlyPrice;
    }, 0);

    return {
        totalTenants: tenantsCount.count || 0,
        activeSubscriptions: activeTenants.length,
        totalUsers: usersCount.count || 0,
        revenueEstimate,
    };
}

export async function getAllTenants(page = 1, limit = 20) {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data: tenantsData, error } = await supabase
        .from('tenants')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const tenantIds = (tenantsData || []).map((t) => t.id);
    const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .in('tenant_id', tenantIds);

    const tenants = (tenantsData || []).map((tenant) => {
        const subs = (subsData || []).filter((s) => s.tenant_id === tenant.id);
        subs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return { ...tenant, subscriptions: subs };
    });

    return {
        tenants,
        total: tenants.length
    };
}

// ─── USUARIOS DEMO ────────────────────────────────────────────────────────────

const DEMO_USERS = {
    owner: '6a5ea8ab-296f-4023-9745-829d85b2512a',
    staff:  '8796a05c-cfd3-462f-a6e9-8b7b635a755a',
} as const;

export async function getDemoUsersStatus(): Promise<{
    owner: boolean;
    staff: boolean;
}> {
    await requireAdmin();
    const supabase = createAdminClient();

    const [ownerRes, staffRes] = await Promise.all([
        supabase.auth.admin.getUserById(DEMO_USERS.owner),
        supabase.auth.admin.getUserById(DEMO_USERS.staff),
    ]);

    // Un usuario está habilitado cuando banned_until es null o está en el pasado
    const isEnabled = (user: any) => {
        if (!user) return false;
        const banned = user.banned_until;
        if (!banned) return true;
        return new Date(banned) <= new Date();
    };

    return {
        owner: isEnabled(ownerRes.data?.user),
        staff: isEnabled(staffRes.data?.user),
    };
}

export async function toggleDemoUser(
    role: 'owner' | 'staff',
    enabled: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdmin();
    const supabase = createAdminClient();

    const userId = DEMO_USERS[role];

    const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: enabled ? 'none' : '876000h', // 'none' = desbanear | 100 años = ban permanente
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}
