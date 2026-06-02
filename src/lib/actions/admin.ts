'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from './auth';

export async function getAdminMetrics() {
    await requireAdmin();
    const supabase = createAdminClient();
    const [tenantsCount, activeSubs, usersCount] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
    ]);
    return {
        totalTenants: tenantsCount.count || 0,
        activeSubscriptions: activeSubs.count || 0,
        totalUsers: usersCount.count || 0,
        revenueEstimate: (activeSubs.count || 0) * 18000,
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

    // Query subscriptions por separado para evitar problemas de RLS
    const tenantIds = (tenantsData || []).map((t) => t.id);

    const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .in('tenant_id', tenantIds);

    // Combinar manualmente
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
