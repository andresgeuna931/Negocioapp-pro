import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
    try {
        const mpClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        });

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const body = await request.json();
        console.log("Webhook received:", JSON.stringify(body, null, 2));

        if (body.type === "payment" || body.type === "preapproval" || body.action?.includes("subscription") || body.action?.includes("payment")) {
            const resourceId = body.data?.id;
            const topic = body.type || body.topic;

            if (!resourceId) return NextResponse.json({ received: true }, { status: 200 });

            let tenantId: string | undefined;
            let mpPlanId: string | undefined;
            let status: string = 'pending';
            let transactionAmount: number = 0;

            if (topic === "payment") {
                const payment = new Payment(mpClient);
                const details = await payment.get({ id: resourceId });
                if (details.status === "approved") {
                    const extRef = details.external_reference || "";
                    if (extRef.includes('___')) {
                        const parts = extRef.split('___');
                        tenantId = parts[0];
                        mpPlanId = parts[1];
                    } else {
                        tenantId = extRef;
                        mpPlanId = details.metadata?.plan_id;
                    }
                    status = "active";
                    transactionAmount = details.transaction_amount || 0;
                }
            } else if (topic === "preapproval") {
                const preApproval = new PreApproval(mpClient);
                const details: any = await preApproval.get({ id: resourceId });
                console.log("PreApproval Details:", JSON.stringify(details, null, 2));
                
                if (details.status === "authorized") {
                    // Extract tenantId and planId from composite external_reference
                    const extRef = details.external_reference || "";
                    if (extRef.includes('___')) {
                        const parts = extRef.split('___');
                        tenantId = parts[0];
                        mpPlanId = parts[1];
                    } else {
                        tenantId = extRef || details.external_id || details.metadata?.tenant_id;
                        mpPlanId = details.preapproval_plan_id || details.metadata?.plan_id;
                    }
                    status = "active";
                }
            }

            if (tenantId && status === "active") {
                // Map to DB-valid enum values
                let dbSubPlan = 'premium';
                let dbTenantPlan = 'professional';
                let internalPlanId = 'professional';

                // Improved matching logic
                const starterId = process.env.NEXT_PUBLIC_MP_PLAN_STARTER;
                const profId = process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL;
                const busId = process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS;
                const testId = process.env.NEXT_PUBLIC_MP_PLAN_TEST;

                if (mpPlanId === testId || mpPlanId === starterId) {
                    dbSubPlan = 'basic';
                    dbTenantPlan = 'starter';
                    internalPlanId = mpPlanId === testId ? 'test' : 'starter';
                } else if (mpPlanId === busId) {
                    dbSubPlan = 'premium';
                    dbTenantPlan = 'business';
                    internalPlanId = 'business';
                } else {
                    // Default to professional if it matches or as fallback for paid status
                    dbSubPlan = 'premium';
                    dbTenantPlan = 'professional';
                    internalPlanId = 'professional';
                }

                // --- INDUSTRY STANDARD: Paid period starts NOW ---
                const now = new Date();
                let periodStart = now;
                let periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 30);

                // Update subscription
                await supabaseAdmin
                    .from("subscriptions")
                    .upsert({
                        tenant_id: tenantId,
                        status: "active",
                        plan: dbSubPlan,
                        current_period_start: periodStart.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                        last_payment_at: now.toISOString(),
                        last_payment_amount: transactionAmount,
                        payment_provider: 'mercadopago',
                        updated_at: now.toISOString(),
                    }, { onConflict: "tenant_id" });

                // Update tenant — ALWAYS set to 'active' after payment
                // Trial days are preserved in the subscription expiry date, not in the status
                await supabaseAdmin
                    .from("tenants")
                    .update({ 
                        status: 'active',
                        plan_type: dbTenantPlan,
                        settings: {
                            plan_id: internalPlanId,
                            last_sync_at: now.toISOString()
                        }
                    })
                    .eq("id", tenantId);

                console.log(`✅ Webhook processed: tenant ${tenantId}, status=active, plan=${internalPlanId}, expires=${periodEnd.toISOString()}`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ received: true }, { status: 200 });
    }
}

export async function GET() {
    return NextResponse.json({ status: "ok" });
}
