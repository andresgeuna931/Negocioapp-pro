'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

/**
 * Verifies subscription status directly with MercadoPago API.
 * This is a BACKUP mechanism — if the webhook fails, this function
 * contacts MP directly to check if the tenant has an active subscription,
 * and updates the database accordingly.
 * 
 * Should be called when a user lands on /config after checkout.
 */
export async function verifySubscriptionWithMP(tenantId: string): Promise<{
    found: boolean;
    plan?: string;
    status?: string;
    error?: string;
}> {
    try {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) {
            console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
            return { found: false, error: 'Token no configurado' };
        }

        // Search for active preapprovals (subscriptions) with this tenant as external_reference
        const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${tenantId}&status=authorized`;

        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error('MP API error:', response.status, await response.text());
            return { found: false, error: `Error MP API: ${response.status}` };
        }

        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
            return { found: false };
        }

        // Take the most recent authorized subscription
        const activeSub = results[0];
        const mpPlanId = activeSub.preapproval_plan_id;

        // Map MP plan ID to internal plan name
        let planId = 'professional'; // default
        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST) planId = 'test';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) planId = 'professional';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) planId = 'business';

        // Create admin client to bypass RLS
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
            console.error('Error upserting subscription:', subError);
            return { found: true, plan: planId, error: subError.message };
        }

        // Update tenant status to active
        const { error: tenantError } = await supabaseAdmin
            .from('tenants')
            .update({ status: 'active', plan_type: planId })
            .eq('id', tenantId);

        if (tenantError) {
            console.error('Error updating tenant:', tenantError);
            return { found: true, plan: planId, error: tenantError.message };
        }

        console.log(`✅ Subscription verified via MP API for tenant ${tenantId}: plan=${planId}`);
        return { found: true, plan: planId, status: 'active' };

    } catch (error: any) {
        console.error('Error verifying subscription with MP:', error);
        return { found: false, error: error.message };
    }
}
