import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint to debug subscription verification.
 * GET /api/debug-subscription
 * 
 * Returns: tenant info, subscription info, and MP API check results.
 * 
 * IMPORTANT: Remove or protect this endpoint before going to production with real users.
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // 2. Get profile + tenant
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
        }

        // 3. Get tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name, status, plan_type, created_at')
            .eq('id', profile.tenant_id)
            .single();

        // 4. Get subscription from DB
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .single();

        // 5. Check MP API
        let mpResult: any = { checked: false };
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (accessToken) {
            try {
                const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${profile.tenant_id}`;
                const response = await fetch(searchUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    cache: 'no-store',
                });

                if (response.ok) {
                    const data = await response.json();
                    mpResult = {
                        checked: true,
                        total: data.results?.length || 0,
                        subscriptions: (data.results || []).map((r: any) => ({
                            id: r.id,
                            status: r.status,
                            plan_id: r.preapproval_plan_id,
                            external_reference: r.external_reference,
                            date_created: r.date_created,
                            payer_email: r.payer_email,
                        })),
                    };
                } else {
                    mpResult = { checked: true, error: `HTTP ${response.status}`, body: await response.text() };
                }
            } catch (e: any) {
                mpResult = { checked: true, error: e.message };
            }
        } else {
            mpResult = { checked: false, error: 'MERCADOPAGO_ACCESS_TOKEN not set' };
        }

        // 6. Check env vars (existence only, not values)
        const envCheck = {
            MERCADOPAGO_ACCESS_TOKEN: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            NEXT_PUBLIC_MP_PLAN_TEST: process.env.NEXT_PUBLIC_MP_PLAN_TEST || 'NOT SET',
            NEXT_PUBLIC_MP_PLAN_STARTER: process.env.NEXT_PUBLIC_MP_PLAN_STARTER || 'NOT SET',
            NEXT_PUBLIC_MP_PLAN_PROFESSIONAL: process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL || 'NOT SET',
            NEXT_PUBLIC_MP_PLAN_BUSINESS: process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS || 'NOT SET',
        };

        return NextResponse.json({
            user: { id: user.id, email: user.email },
            tenant,
            subscription,
            mercadopago: mpResult,
            envVars: envCheck,
            timestamp: new Date().toISOString(),
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
