'use server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from './auth';

/**
 * Fetches global metrics for the super admin dashboard.
 */
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

/**
 * Fetches all tenants with their subscription info for the admin list.
 */
export async function getAllTenants(page = 1, limit = 20) {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('tenants')
        .select(`
            *,
            subscriptions(*),
            profiles(*)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const tenants = (data || []).map((tenant) => {
        const subs = Array.isArray(tenant.subscriptions) ? [...tenant.subscriptions] : [];
        subs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return { ...tenant, subscriptions: subs };
    });

    return {
        tenants,
        total: tenants.length
    };
}
