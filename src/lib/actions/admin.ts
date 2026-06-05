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
