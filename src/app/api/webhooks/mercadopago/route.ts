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
                    tenantId = details.external_reference;
                    mpPlanId = details.metadata?.plan_id;
                    status = "active";
                    transactionAmount = details.transaction_amount || 0;
                }
            } else if (topic === "preapproval") {
                const preApproval = new PreApproval(mpClient);
                const details: any = await preApproval.get({ id: resourceId });
                if (details.status === "authorized") {
                    tenantId = details.external_reference;
                    mpPlanId = details.preapproval_plan_id;
                    status = "active";
                }
            }

            if (tenantId && status === "active") {
                // Map to DB-valid enum values
                let dbSubPlan = 'premium'; // default
                let dbTenantPlan = 'professional'; // default

                if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_TEST || mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_STARTER) {
                    dbSubPlan = 'basic';
                    dbTenantPlan = 'starter';
                } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL) {
                    dbSubPlan = 'premium';
                    dbTenantPlan = 'professional';
                } else if (mpPlanId === process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS) {
                    dbSubPlan = 'premium';
                    dbTenantPlan = 'business';
                }

                const now = new Date();
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 30);

                // Update subscription
                await supabaseAdmin
                    .from("subscriptions")
                    .upsert({
                        tenant_id: tenantId,
                        status: "active",
                        plan: dbSubPlan,
                        current_period_start: now.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                        last_payment_at: now.toISOString(),
                        last_payment_amount: transactionAmount,
                        payment_provider: 'mercadopago',
                        updated_at: now.toISOString(),
                    }, { onConflict: "tenant_id" });

                // Update tenant
                await supabaseAdmin
                    .from("tenants")
                    .update({ 
                        status: 'active',
                        plan_type: dbTenantPlan
                    })
                    .eq("id", tenantId);

                console.log(`✅ Webhook processed: tenant ${tenantId} activated`);
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
