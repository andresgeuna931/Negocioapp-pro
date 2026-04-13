import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

// Lazily create clients inside handlers to avoid build-time failures

export async function POST(request: NextRequest) {
    try {
        // Create clients inside handler
        const mpClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        });

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const body = await request.json();

        console.log("Webhook received:", JSON.stringify(body, null, 2));

        // MercadoPago sends different notification types
        // We care about payment notifications
        if (body.type === "payment" || body.action === "payment.created" || body.action === "payment.updated") {
            const paymentId = body.data?.id;

            if (!paymentId) {
                console.log("No payment ID in webhook body");
                return NextResponse.json({ received: true }, { status: 200 });
            }

            // Fetch payment details from MercadoPago
            const payment = new Payment(mpClient);
            const paymentDetails = await payment.get({ id: paymentId });

            console.log("Payment details:", JSON.stringify(paymentDetails, null, 2));

            // Check if payment is approved
            if (paymentDetails.status === "approved") {
                const tenantId = paymentDetails.external_reference;
                const planId = paymentDetails.metadata?.plan_id || "professional";

                if (!tenantId) {
                    console.error("No tenant ID in external_reference");
                    return NextResponse.json({ error: "Missing tenant reference" }, { status: 400 });
                }

                // Check if tenant is still in trial
                const { data: tenant } = await supabaseAdmin
                    .from("tenants")
                    .select("created_at, status")
                    .eq("id", tenantId)
                    .single();

                let periodStart = new Date();
                let periodEnd = new Date();

                if (tenant && tenant.status === 'trial') {
                    // If still in trial, subscription starts AFTER trial ends
                    const trialEndDate = new Date(tenant.created_at);
                    trialEndDate.setDate(trialEndDate.getDate() + 14);

                    if (new Date() < trialEndDate) {
                        // Still in trial → subscription starts when trial ends
                        periodStart = trialEndDate;
                        periodEnd = new Date(trialEndDate);
                        periodEnd.setDate(periodEnd.getDate() + 30);
                        console.log(`🕐 Tenant ${tenantId} still in trial. Subscription starts ${trialEndDate.toISOString()}`);
                    } else {
                        // Trial already expired → start immediately
                        periodEnd.setDate(periodEnd.getDate() + 30);
                    }
                } else {
                    // Not in trial → start immediately (30 days from now)
                    periodEnd.setDate(periodEnd.getDate() + 30);
                }

                // Update subscription in database
                const { error: updateError } = await supabaseAdmin
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
                    console.error("Error updating subscription:", updateError);
                    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
                }

                // Update the tenant's plan_type
                // If still in trial, keep status as 'trial' (will auto-transition when trial ends)
                // If trial expired, set status to 'active' immediately
                const tenantUpdate: Record<string, string> = { plan_type: planId };
                if (!tenant || tenant.status !== 'trial' || new Date() >= new Date(new Date(tenant.created_at).getTime() + 14 * 24 * 60 * 60 * 1000)) {
                    tenantUpdate.status = 'active';
                }

                await supabaseAdmin
                    .from("tenants")
                    .update(tenantUpdate)
                    .eq("id", tenantId);

                console.log(`✅ Subscription activated for tenant ${tenantId} with plan ${planId}`);
            }
        }

        // Always return 200 to acknowledge receipt
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error) {
        console.error("Webhook processing error:", error);
        // Still return 200 to prevent MP from retrying indefinitely
        return NextResponse.json({ received: true, error: "Processing error" }, { status: 200 });
    }
}

// MercadoPago may send GET requests to verify the webhook URL
export async function GET() {
    return NextResponse.json({ status: "ok", message: "Webhook endpoint active" });
}
