'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './auth';

/**
 * Fetches global metrics for the super admin dashboard.
 */
export async function getAdminMetrics() {
    await requireAdmin();
    const supabase = await createClient();

    const [tenantsCount, activeSubs, usersCount] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
    ]);

    return {
        totalTenants: tenantsCount.count || 0,
        activeSubscriptions: activeSubs.count || 0,
        totalUsers: usersCount.count || 0,
        revenueEstimate: (activeSubs.count || 0) * 18000, // Just an estimate based on Starter price
    };
}

/**
 * Fetches all tenants with their subscription info for the admin list.
 */
export async function getAllTenants(page = 1, limit = 20) {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error, count } = await supabase
        .from('tenants')
        .select(`
            *,
            subscriptions(*),
            profiles(*)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return {
        tenants: data || [],
        total: count || 0
    };
}
