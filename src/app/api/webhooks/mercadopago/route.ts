import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

// Calcula el próximo día 10 desde hoy
function calcularProximoDiez(): Date {
    const now = new Date();
    const dia = now.getDate();
    const mes = now.getMonth();
    const anio = now.getFullYear();

    if (dia < 10) {
        return new Date(anio, mes, 10, 23, 59, 59);
    } else {
        return new Date(anio, mes + 1, 10, 23, 59, 59);
    }
}

// Mapea el planId interno al plan de DB
function mapearPlan(planId: string): { dbSubPlan: string; dbTenantPlan: string; internalPlanId: string } {
    switch (planId) {
        case 'starter':
            return { dbSubPlan: 'basic', dbTenantPlan: 'starter', internalPlanId: 'starter' };
        case 'business':
            return { dbSubPlan: 'premium', dbTenantPlan: 'business', internalPlanId: 'business' };
        case 'business_annual':
            return { dbSubPlan: 'premium', dbTenantPlan: 'business', internalPlanId: 'business_annual' };
        case 'professional_annual':
            return { dbSubPlan: 'premium', dbTenantPlan: 'professional', internalPlanId: 'professional_annual' };
        case 'professional':
        default:
            return { dbSubPlan: 'premium', dbTenantPlan: 'professional', internalPlanId: 'professional' };
    }
}

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
            let planId: string | undefined;
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
                        planId = parts[1];
                    } else {
                        tenantId = extRef;
                        planId = details.metadata?.plan_id;
                    }
                    status = "active";
                    transactionAmount = details.transaction_amount || 0;
                }
            } else if (topic === "preapproval") {
                const preApproval = new PreApproval(mpClient);
                const details: any = await preApproval.get({ id: resourceId });
                console.log("PreApproval Details:", JSON.stringify(details, null, 2));

                if (details.status === "authorized") {
                    const extRef = details.external_reference || "";
                    if (extRef.includes('___')) {
                        const parts = extRef.split('___');
                        tenantId = parts[0];
                        planId = parts[1];
                    } else {
                        tenantId = extRef || details.external_id || details.metadata?.tenant_id;
                        planId = details.metadata?.plan_id;
                    }
                    status = "active";
                }
            }

            if (tenantId && status === "active") {
                const { dbSubPlan, dbTenantPlan, internalPlanId } = mapearPlan(planId || 'professional');

                // Período: desde ahora hasta el próximo día 10
                const now = new Date();
                const periodStart = now;
                const periodEnd = calcularProximoDiez();

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

                console.log(`✅ Webhook processed: tenant ${tenantId}, status=active, plan=${internalPlanId}, next_billing=${periodEnd.toISOString()}`);
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
