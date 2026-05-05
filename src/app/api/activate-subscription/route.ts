import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST/GET /api/activate-subscription
 * 
 * Checks MercadoPago for an authorized subscription, then updates the DB.
 * Uses raw SQL to avoid enum type issues.
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
        let planId = 'professional';
        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) planId = 'starter';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) planId = 'professional';
        else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) planId = 'business';
        log.push(`✅ Plan: ${planId}`);

        // 5. Admin client
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

        // 6. First, check what columns actually exist in subscriptions table
        const { data: currentSub, error: readError } = await admin
            .from('subscriptions')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        if (readError) {
            log.push(`❌ Read subscription error: ${JSON.stringify(readError)}`);
            return NextResponse.json({ error: 'Cannot read subscription', details: readError, log }, { status: 500 });
        }

        log.push(`✅ Current sub columns: ${Object.keys(currentSub || {}).join(', ')}`);
        log.push(`✅ Current sub values: status=${currentSub?.status}, plan=${currentSub?.plan}, plan_id=${currentSub?.plan_id}`);

        // 7. Use raw SQL to bypass enum issues — cast to text first then update
        const now = new Date().toISOString();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        const { data: sqlResult, error: sqlError } = await admin.rpc('exec_sql', {
            query: `
                UPDATE subscriptions 
                SET status = 'active',
                    current_period_start = '${now}',
                    current_period_end = '${periodEnd.toISOString()}',
                    updated_at = '${now}'
                WHERE tenant_id = '${tenantId}';
                
                UPDATE tenants 
                SET status = 'active'
                WHERE id = '${tenantId}';
            `
        });

        if (sqlError) {
            log.push(`⚠️ Raw SQL failed (expected if no exec_sql func): ${sqlError.message}`);
            
            // Fallback: try updating only safe columns (no plan column)
            log.push(`🔄 Trying safe column update...`);
            
            const { error: safeSubError } = await admin
                .from('subscriptions')
                .update({
                    status: 'active',
                    current_period_start: now,
                    current_period_end: periodEnd.toISOString(),
                    updated_at: now,
                })
                .eq('tenant_id', tenantId);

            if (safeSubError) {
                log.push(`❌ Safe sub update failed: ${JSON.stringify(safeSubError)}`);
                return NextResponse.json({ error: 'Sub update failed', details: safeSubError, log }, { status: 500 });
            }
            log.push(`✅ Subscription status updated to active`);

            const { error: safeTenantError } = await admin
                .from('tenants')
                .update({ status: 'active' })
                .eq('id', tenantId);

            if (safeTenantError) {
                log.push(`❌ Safe tenant update failed: ${JSON.stringify(safeTenantError)}`);
                return NextResponse.json({ error: 'Tenant update failed', details: safeTenantError, log }, { status: 500 });
            }
            log.push(`✅ Tenant status updated to active`);
        } else {
            log.push(`✅ Raw SQL executed successfully`);
        }

        return NextResponse.json({ success: true, plan: planId, log });

    } catch (error: any) {
        log.push(`❌ Exception: ${error.message}`);
        return NextResponse.json({ error: error.message, log }, { status: 500 });
    }
}

export async function GET() {
    return POST();
}
