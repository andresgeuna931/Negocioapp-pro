import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST/GET /api/activate-subscription
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
            return NextResponse.json({ error: `MP API ${mpResponse.status}`, log }, { status: 500 });
        }

        const mpData = await mpResponse.json();
        const results = mpData.results || [];
        log.push(`✅ MP returned ${results.length} preapprovals`);

        const activeSub = results.find((r: any) => r.status === 'authorized');
        if (!activeSub) {
            log.push(`❌ No authorized subscription. Statuses: ${results.map((r: any) => r.status).join(', ')}`);
            return NextResponse.json({ error: 'No authorized subscription', log }, { status: 404 });
        }
        log.push(`✅ Found authorized: ${activeSub.id}`);

        // 4. Map plan
        const mpPlanId = activeSub.preapproval_plan_id;
        let internalPlanId = 'professional';
        let dbSubPlan = 'premium'; // mapping for subscription_plan enum (free, basic, premium)
        let dbTenantPlan = 'professional'; // mapping for plan_type enum (starter, professional, business)

        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST) {
            internalPlanId = 'test';
            dbSubPlan = 'basic';
            dbTenantPlan = 'starter';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) {
            internalPlanId = 'starter';
            dbSubPlan = 'basic';
            dbTenantPlan = 'starter';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) {
            internalPlanId = 'professional';
            dbSubPlan = 'premium';
            dbTenantPlan = 'professional';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) {
            internalPlanId = 'business';
            dbSubPlan = 'premium';
            dbTenantPlan = 'business';
        }
        
        log.push(`✅ Internal Plan: ${internalPlanId} (DB Sub: ${dbSubPlan}, DB Tenant: ${dbTenantPlan})`);

        // 5. Admin client
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

        const now = new Date().toISOString();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        // 6. Update Subscription (using the correct enum value 'basic' or 'premium')
        const { error: subError } = await admin
            .from('subscriptions')
            .update({
                status: 'active',
                plan: dbSubPlan, // This matches the 'subscription_plan' enum in DB
                current_period_start: now,
                current_period_end: periodEnd.toISOString(),
                updated_at: now,
                payment_provider: 'mercadopago',
                external_subscription_id: activeSub.id
            })
            .eq('tenant_id', tenantId);

        if (subError) {
            log.push(`❌ Subscription update failed: ${JSON.stringify(subError)}`);
            return NextResponse.json({ error: 'Sub update failed', details: subError, log }, { status: 500 });
        }
        log.push(`✅ Subscription updated`);

        // 7. Update Tenant (using the correct enum value 'starter', 'professional', 'business')
        const { error: tenantError } = await admin
            .from('tenants')
            .update({ 
                status: 'active',
                plan_type: dbTenantPlan 
            })
            .eq('id', tenantId);

        if (tenantError) {
            log.push(`❌ Tenant update failed: ${JSON.stringify(tenantError)}`);
            return NextResponse.json({ error: 'Tenant update failed', details: tenantError, log }, { status: 500 });
        }
        log.push(`✅ Tenant updated`);

        return NextResponse.json({ success: true, plan: internalPlanId, log });

    } catch (error: any) {
        log.push(`❌ Exception: ${error.message}`);
        return NextResponse.json({ error: error.message, log }, { status: 500 });
    }
}

export async function GET() {
    return POST();
}
