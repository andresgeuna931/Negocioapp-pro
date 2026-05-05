import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/activate-subscription
 * 
 * Checks MercadoPago for an authorized subscription for the current user's tenant,
 * then UPDATES (not upserts) the database to reflect the active status.
 * Returns detailed results at every step for debugging.
 */
export async function POST() {
    const log: string[] = [];

    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated', log }, { status: 401 });
        }
        log.push(`✅ User: ${user.email}`);

        // 2. Get tenant
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'No tenant', log }, { status: 404 });
        }
        const tenantId = profile.tenant_id;
        log.push(`✅ Tenant: ${tenantId}`);

        // 3. Check MP
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json({ error: 'No MP token', log }, { status: 500 });
        }

        const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/search?external_reference=${tenantId}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` }, cache: 'no-store' }
        );

        if (!mpResponse.ok) {
            const errText = await mpResponse.text();
            log.push(`❌ MP API error: ${mpResponse.status}`);
            return NextResponse.json({ error: `MP API ${mpResponse.status}`, details: errText, log }, { status: 500 });
        }

        const mpData = await mpResponse.json();
        const results = mpData.results || [];
        log.push(`✅ MP returned ${results.length} preapprovals`);

        // Find authorized subscription
        const activeSub = results.find((r: any) => r.status === 'authorized');
        if (!activeSub) {
            log.push(`❌ No authorized subscription found. Statuses: ${results.map((r: any) => r.status).join(', ')}`);
            return NextResponse.json({ error: 'No authorized subscription', log }, { status: 404 });
        }
        log.push(`✅ Found authorized: ${activeSub.id}, plan=${activeSub.preapproval_plan_id}`);

        // 4. Map plan
        const mpPlanId = activeSub.preapproval_plan_id;
        let planId = 'professional';
        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST) planId = 'test';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) planId = 'professional';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) planId = 'business';
        log.push(`✅ Mapped plan: ${planId}`);

        // 5. Create admin client
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
            return NextResponse.json({ error: 'No service role key', log }, { status: 500 });
        }

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
        );

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        // 6. UPDATE subscription (not upsert)
        const { data: subData, error: subError } = await admin
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
            .eq('tenant_id', tenantId)
            .select();

        if (subError) {
            log.push(`❌ Subscription UPDATE error: ${JSON.stringify(subError)}`);
            return NextResponse.json({ error: 'Subscription update failed', details: subError, log }, { status: 500 });
        }
        log.push(`✅ Subscription updated: ${JSON.stringify(subData)}`);

        // 7. UPDATE tenant
        const { data: tenantData, error: tenantError } = await admin
            .from('tenants')
            .update({ status: 'active', plan_type: planId })
            .eq('id', tenantId)
            .select();

        if (tenantError) {
            log.push(`❌ Tenant UPDATE error: ${JSON.stringify(tenantError)}`);
            return NextResponse.json({ error: 'Tenant update failed', details: tenantError, log }, { status: 500 });
        }
        log.push(`✅ Tenant updated: ${JSON.stringify(tenantData)}`);

        return NextResponse.json({
            success: true,
            plan: planId,
            log,
        });

    } catch (error: any) {
        log.push(`❌ Exception: ${error.message}`);
        return NextResponse.json({ error: error.message, log }, { status: 500 });
    }
}
