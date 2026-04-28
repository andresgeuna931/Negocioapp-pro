'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

/**
 * Verifies subscription status directly with MercadoPago API.
 * This is a BACKUP mechanism — if the webhook fails, this function
 * contacts MP directly to check if the tenant has an active subscription,
 * and updates the database accordingly.
 */
export async function verifySubscriptionWithMP(tenantId: string): Promise<{
    found: boolean;
    plan?: string;
    status?: string;
    error?: string;
    debug?: string;
}> {
    try {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) {
            return { found: false, error: 'Token no configurado', debug: 'MERCADOPAGO_ACCESS_TOKEN missing' };
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return { found: false, error: 'Service role key missing', debug: 'SUPABASE_SERVICE_ROLE_KEY missing' };
        }

        // Search for ALL preapprovals (subscriptions) for this tenant — not just 'authorized'
        // Sometimes MP uses 'authorized', sometimes 'active', sometimes the first payment is still 'pending'
        const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${tenantId}`;

        console.log(`[verify-sub] Searching MP for tenant: ${tenantId}`);

        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[verify-sub] MP API error: ${response.status}`, errText);
            return { found: false, error: `MP API ${response.status}`, debug: errText };
        }

        const data = await response.json();
        const results = data.results || [];

        console.log(`[verify-sub] Found ${results.length} preapprovals for tenant ${tenantId}`);

        if (results.length === 0) {
            return { found: false, debug: 'No preapprovals found for this tenant' };
        }

        // Find the best subscription: prefer 'authorized', then 'pending', then any
        const activeSub = results.find((r: any) => r.status === 'authorized')
            || results.find((r: any) => r.status === 'pending')
            || results[0];

        console.log(`[verify-sub] Best match: status=${activeSub.status}, plan_id=${activeSub.preapproval_plan_id}`);

        // Only proceed if status indicates the user has subscribed (authorized or pending)
        if (!['authorized', 'pending'].includes(activeSub.status)) {
            return { found: false, debug: `Subscription status is '${activeSub.status}', not authorized/pending` };
        }

        const mpPlanId = activeSub.preapproval_plan_id;

        // Map MP plan ID to internal plan name
        let planId = 'professional'; // default
        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST) planId = 'test';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) planId = 'professional';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) planId = 'business';

        console.log(`[verify-sub] Mapped plan: ${planId} (MP plan: ${mpPlanId})`);

        // Create admin client to bypass RLS — MUST use service role key
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        // Upsert subscription record
        const { error: subError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                tenant_id: tenantId,
                status: 'active',
                plan: planId,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                last_payment_at: now.toISOString(),
                payment_provider: 'mercadopago',
                updated_at: now.toISOString(),
            }, {
                onConflict: 'tenant_id'
            });

        if (subError) {
            console.error('[verify-sub] Error upserting subscription:', JSON.stringify(subError));
            return { found: true, plan: planId, error: `DB subscription error: ${subError.message}`, debug: JSON.stringify(subError) };
        }

        // Update tenant status to active
        const { error: tenantError } = await supabaseAdmin
            .from('tenants')
            .update({ status: 'active', plan_type: planId })
            .eq('id', tenantId);

        if (tenantError) {
            console.error('[verify-sub] Error updating tenant:', JSON.stringify(tenantError));
            return { found: true, plan: planId, error: `DB tenant error: ${tenantError.message}`, debug: JSON.stringify(tenantError) };
        }

        console.log(`[verify-sub] ✅ SUCCESS: tenant ${tenantId} → active, plan=${planId}`);
        return { found: true, plan: planId, status: 'active' };

    } catch (error: any) {
        console.error('[verify-sub] Unexpected error:', error);
        return { found: false, error: error.message, debug: error.stack };
    }
}
