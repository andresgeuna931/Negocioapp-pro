'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from "mercadopago";

/**
 * Verifies a one-off payment or instant payment verification from MercadoPago.
 */
export async function verifyMercadoPagoPayment(paymentId: string) {
    if (!paymentId) return { success: false, error: 'No payment ID' };

    try {
        const mpClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        });

        const payment = new Payment(mpClient);
        const paymentDetails = await payment.get({ id: paymentId });

        if (paymentDetails.status !== "approved") {
            return { success: false, message: 'Pago no está aprobado aún' };
        }

        const tenantId = paymentDetails.external_reference;
        const mpPlanId = paymentDetails.metadata?.plan_id;

        if (!tenantId) {
            return { success: false, error: 'Payment is missing tenant reference' };
        }

        const supabaseAdmin = await createClient();

        const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("created_at, status")
            .eq("id", tenantId)
            .single();

        let periodStart = new Date();
        let periodEnd = new Date();

        if (tenant && tenant.status === 'trial') {
            const trialEndDate = new Date(tenant.created_at);
            trialEndDate.setDate(trialEndDate.getDate() + 14);

            if (new Date() < trialEndDate) {
                periodStart = trialEndDate;
                periodEnd = new Date(trialEndDate);
                periodEnd.setDate(periodEnd.getDate() + 30);
            } else {
                periodEnd.setDate(periodEnd.getDate() + 30);
            }
        } else {
            periodEnd.setDate(periodEnd.getDate() + 30);
        }

        let dbSubPlan = 'professional';
        let dbTenantPlan = 'professional';
        let internalPlanId = 'professional';

        if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST || mpPlanId === 'test' || mpPlanId === 'starter') {
            dbSubPlan = 'starter';
            dbTenantPlan = 'starter';
            internalPlanId = mpPlanId === 'test' ? 'test' : 'starter';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL || mpPlanId === 'professional') {
            dbSubPlan = 'professional';
            dbTenantPlan = 'professional';
            internalPlanId = 'professional';
        } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS || mpPlanId === 'business') {
            dbSubPlan = 'business';
            dbTenantPlan = 'business';
            internalPlanId = 'business';
        }

        const supabaseServiceRole = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const now = new Date().toISOString();

        const { error: subError } = await supabaseServiceRole
            .from("subscriptions")
            .upsert({
                tenant_id: tenantId,
                status: "active",
                plan: dbSubPlan,
                current_period_start: periodStart.toISOString(),
                current_period_end: periodEnd.toISOString(),
                last_payment_at: now,
                last_payment_amount: paymentDetails.transaction_amount,
                payment_provider: 'mercadopago',
                updated_at: now,
            }, {
                onConflict: "tenant_id"
            });

        if (subError) {
            console.error("Manual verify Sub DB error:", subError);
            return { success: false, error: 'Database update failed (sub)' };
        }

        const { error: tenantError } = await supabaseServiceRole
            .from("tenants")
            .update({
                status: 'active',
                plan_type: dbTenantPlan,
                settings: {
                    plan_id: internalPlanId,
                    last_sync_at: now
                }
            })
            .eq("id", tenantId);

        if (tenantError) {
            console.error("Manual verify Tenant DB error:", tenantError);
            return { success: false, error: 'Database update failed (tenant)' };
        }

        return { success: true };
    } catch (e) {
        console.error("Verification failed:", e);
        return { success: false, error: 'Verification failed' };
    }
}
