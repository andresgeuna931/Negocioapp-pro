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

        const mpData = await mpResponse.json();
        const results = mpData.results || [];
        const activeSub = results.find((r: any) => r.status === 'authorized');
        
        if (!activeSub) {
            return NextResponse.json({ error: 'No authorized subscription', log }, { status: 404 });
        }

        // 4. Map plan
        const mpPlanId = activeSub.preapproval_plan_id;
        let internalPlanId = 'professional';
        let dbSubPlan = 'premium'; 
        let dbTenantPlan = 'professional';

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
        
        log.push(`✅ Internal Plan: ${internalPlanId}`);

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

        const now = new Date().toISOString();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        // 5. Update Subscription
        await admin
            .from('subscriptions')
            .update({
                status: 'active',
                plan: dbSubPlan,
                current_period_start: now,
                current_period_end: periodEnd.toISOString(),
                updated_at: now,
                payment_provider: 'mercadopago',
                external_subscription_id: activeSub.id
            })
            .eq('tenant_id', tenantId);

        // 6. Update Tenant + Settings
        // We store the REAL plan ID in settings to bypass enum constraints for display
        await admin
            .from('tenants')
            .update({ 
                status: 'active',
                plan_type: dbTenantPlan,
                settings: { 
                    plan_id: internalPlanId,
                    last_sync_at: now
                }
            })
            .eq('id', tenantId);

        return NextResponse.json({ success: true, plan: internalPlanId, log });

    } catch (error: any) {
        log.push(`❌ Exception: ${error.message}`);
        return NextResponse.json({ error: error.message, log }, { status: 500 });
    }
}

export async function GET() {
    return POST();
}
