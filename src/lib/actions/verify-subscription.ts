'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

/**
 * Verifies subscription status directly with MercadoPago API.
 */
export async function verifySubscriptionWithMP(tenantId: string): Promise<{
    found: boolean;
    plan?: string;
    status?: string;
    error?: string;
}> {
    try {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!accessToken || !serviceRoleKey) {
            return { found: false, error: 'Missing env vars' };
        }

        const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${tenantId}`;
        const response = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store',
        });

        if (!response.ok) return { found: false, error: `MP API ${response.status}` };

        const data = await response.json();
        const results = data.results || [];

        const activeSub = results.find((r: any) => r.status === 'authorized');
        if (!activeSub) return { found: false };

        // Map to DB-valid enum values
        const mpPlanId = activeSub.preapproval_plan_id;
        let dbSubPlan = 'premium';
        let dbTenantPlan = 'professional';
        let internalPlan = 'professional';

        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST || mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) {
            dbSubPlan = 'basic';
            dbTenantPlan = 'starter';
            internalPlan = 'starter';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) {
            dbSubPlan = 'premium';
            dbTenantPlan = 'professional';
            internalPlan = 'professional';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) {
            dbSubPlan = 'premium';
            dbTenantPlan = 'business';
            internalPlan = 'business';
        }

        const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        // Update Subscriptions
        await admin
            .from('subscriptions')
            .update({
                status: 'active',
                plan: dbSubPlan,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: now.toISOString(),
                payment_provider: 'mercadopago',
                external_subscription_id: activeSub.id
            })
            .eq('tenant_id', tenantId);

        // Update Tenants
        await admin
            .from('tenants')
            .update({ 
                status: 'active',
                plan_type: dbTenantPlan 
            })
            .eq('id', tenantId);

        return { found: true, plan: internalPlan, status: 'active' };

    } catch (error: any) {
        return { found: false, error: error.message };
    }
}
