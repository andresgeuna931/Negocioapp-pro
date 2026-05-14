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

        // --- IMPROVED PLAN MAPPING ---
        const starterId = process.env.NEXT_PUBLIC_MP_PLAN_STARTER;
        const profId = process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL;
        const busId = process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS;
        const testId = process.env.NEXT_PUBLIC_MP_PLAN_TEST;

        const mpPlanId = activeSub.preapproval_plan_id;
        let dbSubPlan = 'premium';
        let dbTenantPlan = 'professional';
        let internalPlan = 'professional';

        if (mpPlanId === testId || mpPlanId === starterId) {
            dbSubPlan = 'basic';
            dbTenantPlan = 'starter';
            internalPlan = 'starter';
        } else if (mpPlanId === busId) {
            dbSubPlan = 'premium';
            dbTenantPlan = 'business';
            internalPlan = 'business';
        } else {
            // Default to professional as fallback for successful payments
            dbSubPlan = 'premium';
            dbTenantPlan = 'professional';
            internalPlan = 'professional';
        }

        const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        // 1. Upsert Subscription (works for both new and existing users)
        await admin
            .from('subscriptions')
            .upsert({
                tenant_id: tenantId,
                status: 'active',
                plan: dbSubPlan,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: now.toISOString(),
                payment_provider: 'mercadopago',
                external_subscription_id: activeSub.id,
                last_payment_at: now.toISOString()
            }, { onConflict: 'tenant_id' });

        // 2. Update Tenant Status
        await admin
            .from('tenants')
            .update({ 
                status: 'active',
                plan_type: dbTenantPlan,
                settings: {
                    plan_id: internalPlan,
                    last_sync_at: now.toISOString()
                }
            })
            .eq('id', tenantId);

        return { found: true, plan: internalPlan, status: 'active' };

    } catch (error: any) {
        return { found: false, error: error.message };
    }
}
