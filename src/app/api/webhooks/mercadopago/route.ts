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
        if (body.type === "payment" || body.type === "preapproval" || body.action?.includes("subscription") || body.action?.includes("payment")) {
            const paymentId = body.data?.id;
            const resourceId = body.data?.id;
            const topic = body.type || body.topic;

            if (!resourceId) {
                console.log("No resource ID in webhook body");
                return NextResponse.json({ received: true }, { status: 200 });
            }

            let tenantId: string | undefined;
            let planId: string | undefined;
            let status: string = 'pending';
            let transactionAmount: number = 0;

            if (topic === "payment") {
                // Fetch payment details
                const payment = new Payment(mpClient);
                const details = await payment.get({ id: resourceId });
                if (details.status === "approved") {
                    tenantId = details.external_reference;
                    planId = details.metadata?.plan_id || "professional";
                    status = "active";
                    transactionAmount = details.transaction_amount || 0;
                }
            } else if (topic === "preapproval") {
                // Fetch subscription (preapproval) details
                const preApproval = new PreApproval(mpClient);
                const details = await preApproval.get({ id: resourceId });
                console.log("PreApproval details:", JSON.stringify(details, null, 2));
                
                if (details.status === "authorized") {
                    tenantId = details.external_reference;
                    // We can derive current plan from the preapproval_plan_id if needed, 
                    // but for now we follow the external ref.
                    status = "active";
                }
            }

            if (tenantId && status === "active") {
                // Determine plan name from DB or logic
                // For simplicity, we keep the plan mapping
                const finalPlan = planId || "professional";

                // Check tenant trial
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

                // Update subscription in database
                const { error: updateError } = await supabaseAdmin
                    .from("subscriptions")
                    .upsert({
                        tenant_id: tenantId,
                        status: "active",
                        plan: finalPlan,
                        current_period_start: periodStart.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                        last_payment_at: new Date().toISOString(),
                        last_payment_amount: transactionAmount,
                        payment_provider: 'mercadopago',
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: "tenant_id"
                    });

                if (updateError) {
                    console.error("Error updating subscription:", updateError);
                }

                const tenantUpdate: Record<string, string> = { plan_type: finalPlan, status: 'active' };
                await supabaseAdmin
                    .from("tenants")
                    .update(tenantUpdate)
                    .eq("id", tenantId);

                console.log(`✅ Subscription/Payment processed for tenant ${tenantId}`);
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
