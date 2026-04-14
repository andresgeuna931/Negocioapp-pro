'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from "mercadopago";

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
        const planId = paymentDetails.metadata?.plan_id || "professional";

        if (!tenantId) {
            return { success: false, error: 'Payment is missing tenant reference' };
        }

        const supabaseAdmin = await createClient();

        // Validate if already processed
        const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('last_payment_at, status')
            .eq('tenant_id', tenantId)
            .single();
            
        // If it's already active, we don't strictly need to do it, but we can update to make sure it's correct.

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
                // Still in trial
                periodStart = trialEndDate;
                periodEnd = new Date(trialEndDate);
                periodEnd.setDate(periodEnd.getDate() + 30);
            } else {
                periodEnd.setDate(periodEnd.getDate() + 30);
            }
        } else {
            periodEnd.setDate(periodEnd.getDate() + 30);
        }

        // We use service role key to bypass RLS since users might not have permissions to upsert subscriptions
        const supabaseServiceRole = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Update DB
        // NOTE: we use fetch to the API route to reuse the exact same logic, or we just do it here. 
        // We do it directly via service role client here:
        const { error: updateError } = await supabaseServiceRole
            .from("subscriptions")
            .upsert({
                tenant_id: tenantId,
                status: "active",
                plan: planId,
                current_period_start: periodStart.toISOString(),
                current_period_end: periodEnd.toISOString(),
                last_payment_at: new Date().toISOString(),
                last_payment_amount: paymentDetails.transaction_amount,
                payment_provider: 'mercadopago',
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "tenant_id"
            });

        if (updateError) {
            console.error("Manual verify DB error:", updateError);
            return { success: false, error: 'Database update failed' };
        }

        const tenantUpdate: Record<string, string> = { plan_type: planId };
        if (!tenant || tenant.status !== 'trial' || new Date() >= new Date(new Date(tenant.created_at).getTime() + 14 * 24 * 60 * 60 * 1000)) {
            tenantUpdate.status = 'active';
        }

        await supabaseServiceRole
            .from("tenants")
            .update(tenantUpdate)
            .eq("id", tenantId);

        return { success: true };
    } catch (e) {
        console.error("Verification failed:", e);
        return { success: false, error: 'Verification failed' };
    }
}
