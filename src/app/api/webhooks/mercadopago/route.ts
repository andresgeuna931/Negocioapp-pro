import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

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

function calcularProximoDiezAnual(): Date {
    const now = new Date();
    const dia = now.getDate();
    const mes = now.getMonth();
    const anio = now.getFullYear();

    if (dia < 10) {
        return new Date(anio + 1, mes, 10, 23, 59, 59);
    } else {
        return new Date(anio + 1, mes + 1, 10, 23, 59, 59);
    }
}

function mapearPlan(planId: string): { dbSubPlan: string; dbTenantPlan: string; internalPlanId: string; isAnnual: boolean } {
    switch (planId) {
        case 'starter':
            return { dbSubPlan: 'starter', dbTenantPlan: 'starter', internalPlanId: 'starter', isAnnual: false };
        case 'business':
            return { dbSubPlan: 'business', dbTenantPlan: 'business', internalPlanId: 'business', isAnnual: false };
        case 'business_annual':
            return { dbSubPlan: 'business_annual', dbTenantPlan: 'business', internalPlanId: 'business_annual', isAnnual: true };
        case 'professional_annual':
            return { dbSubPlan: 'professional_annual', dbTenantPlan: 'professional', internalPlanId: 'professional_annual', isAnnual: true };
        case 'professional':
        default:
            return { dbSubPlan: 'professional', dbTenantPlan: 'professional', internalPlanId: 'professional', isAnnual: false };
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

        if (
            body.type === "payment" ||
            body.type === "preapproval" ||
            body.type === "subscription_preapproval" ||
            body.type === "subscription_authorized_payment" ||
            body.action?.includes("subscription") ||
            body.action?.includes("payment")
        ) {
            const resourceId = body.data?.id;
            const topic = body.type || body.topic;

            if (!resourceId) return NextResponse.json({ received: true }, { status: 200 });

            let tenantId: string | undefined;
            let planId: string | undefined;
            let status: string = 'pending';
            let transactionAmount: number = 0;
            let externalSubscriptionId: string | undefined;
            // Fecha real del próximo cobro según MercadoPago (preapproval.next_payment_date).
            // Si está disponible, la usamos en vez de calcular el día 10 nosotros,
            // para que la base siempre coincida con lo que MP va a cobrar.
            let mpNextPaymentDate: string | undefined;

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
                    externalSubscriptionId = (details as any).preapproval_id || undefined;
                }
            } else if (topic === "subscription_authorized_payment") {
                // Los pagos de suscripción viven en /v1/authorized_payments, NO en /v1/payments.
                // MP manda el webhook antes de que el recurso esté disponible en la API
                // (condición de carrera). Reintentamos hasta 3 veces con 3s de espera.
                try {
                    const fetchAuthorizedPayment = async (id: string) => {
                        const res = await fetch(
                            `https://api.mercadopago.com/v1/authorized_payments/${id}`,
                            { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
                        );
                        return res.json();
                    };

                    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                    let paymentDetails: any = null;
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        const result = await fetchAuthorizedPayment(resourceId);
                        if (result.status === "approved") {
                            paymentDetails = result;
                            console.log(`authorized_payment OK (intento ${attempt}):`, JSON.stringify(result, null, 2));
                            break;
                        }
                        console.log(`authorized_payment intento ${attempt} — esperando 3s...`, result.error || result.status);
                        if (attempt < 3) await sleep(3000);
                    }

                    if (paymentDetails?.status === "approved") {
                        transactionAmount = paymentDetails.transaction_amount || 0;
                        const preapprovalId = paymentDetails.preapproval_id;

                        if (preapprovalId) {
                            const preApproval = new PreApproval(mpClient);
                            const preApprovalDetails: any = await preApproval.get({ id: preapprovalId });
                            console.log("PreApproval from authorized_payment:", JSON.stringify(preApprovalDetails, null, 2));

                            const extRef = preApprovalDetails.external_reference || "";
                            if (extRef.includes('___')) {
                                const parts = extRef.split('___');
                                tenantId = parts[0];
                                planId = parts[1];
                            } else {
                                tenantId = extRef || preApprovalDetails.metadata?.tenant_id;
                                planId = preApprovalDetails.metadata?.plan_id;
                            }
                            status = "active";
                            externalSubscriptionId = preapprovalId;
                            if (preApprovalDetails.next_payment_date) {
                                mpNextPaymentDate = preApprovalDetails.next_payment_date;
                            }
                        } else {
                            console.warn("subscription_authorized_payment: no preapproval_id en el pago", paymentDetails);
                        }
                    } else {
                        console.warn("subscription_authorized_payment: recurso no disponible tras 3 intentos, usando fallback de preapproval");
                    }
                } catch (err) {
                    console.error("Error procesando subscription_authorized_payment:", err);
                }
            } else if (topic === "preapproval" || topic === "subscription_preapproval") {
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
                    externalSubscriptionId = details.id || resourceId;
                    // Guardamos next_payment_date SOLO si ya procesó un pago real.
                    // Si next_payment_date == date_created, el PreApproval acaba de
                    // crearse y la fecha es placeholder — la fecha real la trae
                    // el evento subscription_authorized_payment que llega después.
                    if (details.next_payment_date) {
                        const nextPayment = new Date(details.next_payment_date).getTime();
                        const dateCreated = new Date(details.date_created).getTime();
                        const diffSeconds = Math.abs(nextPayment - dateCreated) / 1000;
                        if (diffSeconds > 60) {
                            // Más de 1 minuto de diferencia = fecha real de próximo cobro
                            mpNextPaymentDate = details.next_payment_date;
                        } else {
                            console.log(`PreApproval next_payment_date es placeholder (diff ${diffSeconds}s) — esperando subscription_authorized_payment para fecha real`);
                        }
                    }
                }
            }

            if (tenantId && status === "active") {
                // --- ESCENARIO 10: guard de idempotencia ---
                // Si el tenant ya está activo Y tuvo un pago hace menos de 5 minutos,
                // es muy probablemente un pago duplicado (doble click en "Renovar").
                // EXCEPCIÓN: subscription_authorized_payment nunca se bloquea — es el
                // evento que trae la fecha real de MP y siempre debe procesarse.
                const { data: currentSub } = await supabaseAdmin
                    .from("subscriptions")
                    .select("status, last_payment_at")
                    .eq("tenant_id", tenantId)
                    .single();

                if (
                    topic !== "subscription_authorized_payment" &&
                    currentSub?.status === "active" &&
                    currentSub.last_payment_at
                ) {
                    const msSinceLastPayment = Date.now() - new Date(currentSub.last_payment_at).getTime();
                    const FIVE_MINUTES = 5 * 60 * 1000;
                    if (msSinceLastPayment < FIVE_MINUTES) {
                        console.log(`⚠️ Webhook idempotency: pago duplicado para tenant ${tenantId} (último pago hace ${Math.round(msSinceLastPayment / 1000)}s). Evento ignorado.`);
                        return NextResponse.json({ received: true }, { status: 200 });
                    }
                }
                // --- fin guard ---

                const { dbSubPlan, dbTenantPlan, internalPlanId, isAnnual } = mapearPlan(planId || 'professional');

                const now = new Date();
                const periodStart = now;
                // Preferimos la fecha real de MP. Si por algún motivo no vino
                // (ej. evento de tipo 'payment' que no la incluye), caemos al
                // cálculo histórico del día 10 como red de seguridad.
                let periodEnd: Date;
                if (mpNextPaymentDate) {
                    const parsed = new Date(mpNextPaymentDate);
                    periodEnd = isNaN(parsed.getTime())
                        ? (isAnnual ? calcularProximoDiezAnual() : calcularProximoDiez())
                        : parsed;
                } else {
                    periodEnd = isAnnual ? calcularProximoDiezAnual() : calcularProximoDiez();
                }

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
                        external_subscription_id: externalSubscriptionId,
                        updated_at: now.toISOString(),
                    }, { onConflict: "tenant_id" });

                const { data: updatedTenant } = await supabaseAdmin
                    .from("tenants")
                    .update({
                        status: 'active',
                        plan_type: dbTenantPlan,
                        settings: {
                            plan_id: internalPlanId,
                            last_sync_at: now.toISOString()
                        }
                    })
                    .eq("id", tenantId)
                    .select("name")
                    .single();

                console.log(`✅ Webhook processed: tenant ${tenantId}, status=active, plan=${internalPlanId}, next_billing=${periodEnd.toISOString()} (fuente: ${mpNextPaymentDate ? 'MP' : 'fallback-dia10'}), preapproval_id=${externalSubscriptionId}`);

                // Notificación admin — no bloquea el flujo si falla
                try {
                    const tenantName = updatedTenant?.name || tenantId;
                    const montoStr = transactionAmount > 0
                        ? ` — $${transactionAmount.toLocaleString('es-AR')}`
                        : '';
                    await supabaseAdmin.from("admin_notifications").insert({
                        type: 'payment_received',
                        title: '💰 Pago recibido',
                        message: `${tenantName} — plan ${internalPlanId}${montoStr}`,
                        tenant_id: tenantId,
                    });
                } catch (notifError) {
                    console.error("Error creando notificación:", notifError);
                }
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
