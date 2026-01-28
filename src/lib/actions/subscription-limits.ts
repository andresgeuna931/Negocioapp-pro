'use server';

import { createClient } from '@/lib/supabase/server';
import { PLANS, getPlanDetails } from '@/lib/config/plans';
import { getTenantSettings, getSubscriptionStatus } from '@/lib/actions/auth';

type ResourceType = 'products' | 'users';

export interface LimitCheckResult {
    success: boolean;
    error?: string;
    limit?: number;
    usage?: number;
    planName?: string;
}

export async function checkResourceLimit(resource: ResourceType): Promise<LimitCheckResult> {
    const supabase = await createClient();

    // 1. Get Tenant & Subscription
    const [tenant, subscriptionResult] = await Promise.all([
        getTenantSettings(),
        getSubscriptionStatus()
    ]);

    if (!tenant) {
        return { success: false, error: 'Tenant no encontrado' };
    }

    const subscription = subscriptionResult?.subscription;
    const now = new Date();

    // 2. Check Subscription Status (Strict Access Control)
    // Rules:
    // - Active/Trialing: OK
    // - Past Due/Canceled: Block unless within grace period (handled by Stripe/MP usually, here we check status)
    // - None: Check if within default 14-day trial of the tenant creation

    let isAccessAllowed = false;
    let effectivePlanId = 'starter'; // Default fallback (though strictly we block if unpaid)

    if (subscription && ['active', 'trial'].includes(subscription.status)) {
        isAccessAllowed = true;
        effectivePlanId = subscription?.plan_id || 'starter';
    } else {
        // No active subscription. Check implicit Trial (14 days from tenant creation)
        const createdAt = new Date(tenant.created_at);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        if (now < trialEndDate) {
            isAccessAllowed = true;
            effectivePlanId = 'professional'; // Give them Pro features during trial
        } else {
            // Trial expired and no sub
            return {
                success: false,
                error: 'Tu periodo de prueba ha finalizado. Por favor, suscribite a un plan para continuar.'
            };
        }
    }

    // 3. Get Plan Limits
    const plan = getPlanDetails(effectivePlanId);
    const limit = plan.limits[resource];

    // If limit is -1, it's unlimited
    if (limit === -1) {
        return { success: true, limit: Infinity, planName: plan.name };
    }

    // 4. Count Usage
    let dataCount = 0;

    if (resource === 'products') {
        const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('tenant_id', tenant.id);

        if (error) return { success: false, error: error.message };
        dataCount = count || 0;
    } else if (resource === 'users') {
        // Count profiles linked to tenant? Or check logic. 
        // Usually we count profiles where tenant_id = current.
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

        if (error) return { success: false, error: error.message };
        // Users limit usually includes the owner, so raw count is fine.
        dataCount = count || 0;
    }

    // 5. Compare
    if (dataCount >= limit) {
        return {
            success: false,
            error: `Has alcanzado el límite de ${limit} ${resource === 'products' ? 'productos' : 'usuarios'} de tu plan ${plan.name}.`,
            limit,
            usage: dataCount,
            planName: plan.name
        };
    }

    return {
        success: true,
        limit,
        usage: dataCount,
        planName: plan.name
    };
}
