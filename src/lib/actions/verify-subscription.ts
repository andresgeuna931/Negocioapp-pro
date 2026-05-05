'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

/**
 * Verifies subscription status directly with MercadoPago API.
 * Uses UPDATE (not upsert) to be more reliable with existing rows.
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
            console.error('[verify-sub] Missing env vars', { hasToken: !!accessToken, hasServiceKey: !!serviceRoleKey });
            return { found: false, error: 'Missing env vars' };
        }

        // Search ALL preapprovals for this tenant
        const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${tenantId}`;
        const response = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store',
        });

        if (!response.ok) {
            return { found: false, error: `MP API ${response.status}` };
        }

        const data = await response.json();
        const results = data.results || [];

        // Find authorized subscription
        const activeSub = results.find((r: any) => r.status === 'authorized')
            || results.find((r: any) => r.status === 'pending');

        if (!activeSub) {
            return { found: false };
        }

        // Map plan
        const mpPlanId = activeSub.preapproval_plan_id;
        let planId = 'professional';
        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) planId = 'professional';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) planId = 'business';

        // Admin client
        const admin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        // UPDATE subscription (not upsert — more reliable for existing rows)
        const { error: subError } = await admin
            .from('subscriptions')
            .update({
                status: 'active',
                plan: planId,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                last_payment_at: now.toISOString(),
                payment_provider: 'mercadopago',
                external_subscription_id: activeSub.id,
                updated_at: now.toISOString(),
            })
            .eq('tenant_id', tenantId);

        if (subError) {
            console.error('[verify-sub] Subscription UPDATE failed:', JSON.stringify(subError));
            return { found: true, plan: planId, error: `sub update: ${subError.message}` };
        }

        // UPDATE tenant
        const { error: tenantError } = await admin
            .from('tenants')
            .update({ status: 'active', plan_type: planId })
            .eq('id', tenantId);

        if (tenantError) {
            console.error('[verify-sub] Tenant UPDATE failed:', JSON.stringify(tenantError));
            return { found: true, plan: planId, error: `tenant update: ${tenantError.message}` };
        }

        console.log(`[verify-sub] ✅ Activated tenant ${tenantId} → plan=${planId}`);
        return { found: true, plan: planId, status: 'active' };

    } catch (error: any) {
        console.error('[verify-sub] Error:', error.message);
        return { found: false, error: error.message };
    }
}
