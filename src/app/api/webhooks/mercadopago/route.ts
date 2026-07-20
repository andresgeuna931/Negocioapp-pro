import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { getPlanDetails } from "@/lib/config/plans";

function verifyMPSignature(request: NextRequest, rawBody: string): boolean {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
        console.error("MP_WEBHOOK_SECRET no configurado");
        return false;
    }

    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    if (!xSignature || !xRequestId) return false;

    const parts = xSignature.split(",");
    let ts = "";
    let v1 = "";
    for (const part of parts) {
        const [key, value] = part.trim().split("=");
        if (key === "ts") ts = value;
        if (key === "v1") v1 = value;
    }

    if (!ts || !v1) return false;

    let dataId = "";
    try {
        const parsed = JSON.parse(rawBody);
        dataId = parsed?.data?.id || "";
    } catch {
        return false;
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const hmac = createHmac("sha256", secret).update(manifest).digest("hex");

    return hmac === v1;
}

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

// MP-10: sin fallback automático — plan desconocido retorna null → revisión manual
function mapearPlan(planId: string): { dbSubPlan: string; dbTenantPlan: string; internalPlanId: string; isAnnual: boolean } | null {
    switch (planId) {
        case 'starter':
            return { dbSubPlan: 'starter', dbTenantPlan: 'starter', internalPlanId: 'starter', isAnnual: false };
        case 'professional':
            return { dbSubPlan: 'professional', dbTenantPlan: 'professional', internalPlanId: 'professional', isAnnual: false };
        case 'professional_annual':
            return { dbSubPlan: 'professional_annual', dbTenantPlan: 'professional', internalPlanId: 'professional_annual', isAnnual: true };
        case 'business':
            return { dbSubPlan: 'business', dbTenantPlan: 'business', internalPlanId: 'business', isAnnual: false };
        case 'business_annual':
            return { dbSubPlan: 'business_annual', dbTenantPlan: 'business', internalPlanId: 'business_annual', isAnnual: true };
        default:
            return null;
    }
}

// Parsea external_reference con formato tenantId___planId
function parseExtRef(extRef: string): { tenantId?: string; planId?: string } {
    if (!extRef) return {};
    if (extRef.includes('___')) {
        const parts = extRef.split('___');
        return { tenantId: parts[0], planId: parts[1] };
    }
    return { tenantId: extRef };
}

export async function POST(request: NextRequest) {
    // supabaseAdmin y eventKey a nivel función para poder liberar el claim en el catch
    let eventKey: string | undefined;
    let supabaseAdmin: any;
    let eventClaimed = false;

    const releaseClaim = async () => {
        if (eventClaimed && eventKey && supabaseAdmin) {
            try {
                await supabaseAdmin.from('mp_webhook_events').delete().eq('event_key', eventKey);
            } catch (e) {
                console.error("Error liberando claim de evento:", e);
            }
        }
    };

    try {
        const rawBody = await request.text();

        if (!verifyMPSignature(request, rawBody)) {
            console.warn("Webhook rechazado: firma inválida");
            return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);

        const mpClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        });

        supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        console.log("Webhook received:", JSON.stringify(body, null, 2));

        const esEventoRelevante =
            body.type === "payment" ||
            body.type === "preapproval" ||
            body.type === "subscription_preapproval" ||
            body.type === "subscription_authorized_payment" ||
            body.action?.includes("subscription") ||
            body.action?.includes("payment");

        if (!esEventoRelevante) {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const resourceId = body.data?.id;
        const topic = body.type || body.topic;

        if (!resourceId) return NextResponse.json({ received: true }, { status: 200 });

        let tenantId: string | undefined;
        let planId: string | undefined;
        let status: string = 'pending';
        let transactionAmount: number = 0;
        let currencyId: string | undefined;
        let externalSubscriptionId: string | undefined;
        let mpNextPaymentDate: string | undefined;

        // ============================================
        // CONSULTA A MP SEGÚN TOPIC
        // Si la API de MP falla → 500 para que MP reintente (MP-05)
        // ============================================
        if (topic === "payment") {
            const payment = new Payment(mpClient);
            const details = await payment.get({ id: resourceId });

            if (details.status === "approved") {
                const parsed = parseExtRef(details.external_reference || "");
                tenantId = parsed.tenantId;
                planId = parsed.planId || details.metadata?.plan_id;
                status = "active";
                transactionAmount = details.transaction_amount || 0;
                currencyId = details.currency_id || undefined;
                externalSubscriptionId = (details as any).preapproval_id || undefined;
                eventKey = `payment:${resourceId}`;
            } else if (details.status === "rejected" || details.status === "cancelled") {
                // MP-09: pago rechazado — registrar y notificar, sin activar
                const parsed = parseExtRef(details.external_reference || "");
                eventKey = `payment:${resourceId}:${details.status}`;

                const { data: claimed } = await supabaseAdmin
                    .from('mp_webhook_events')
                    .upsert(
                        { event_key: eventKey, topic, resource_id: String(resourceId), tenant_id: parsed.tenantId || null },
                        { onConflict: 'event_key', ignoreDuplicates: true }
                    )
                    .select();

                if (claimed && claimed.length > 0 && parsed.tenantId) {
                    await supabaseAdmin.from("admin_notifications").insert({
                        type: 'payment_rejected',
                        title: '❌ Pago rechazado',
                        message: `Pago ${details.status} para tenant ${parsed.tenantId} — $${(details.transaction_amount || 0).toLocaleString('es-AR')}`,
                        tenant_id: parsed.tenantId,
                    });
                }
                return NextResponse.json({ received: true }, { status: 200 });
            }
        } else if (topic === "subscription_authorized_payment") {
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
                    console.log(`authorized_payment OK (intento ${attempt})`);
                    break;
                }
                if (result.status === "rejected") {
                    // MP-09: cobro recurrente rechazado — notificar sin activar
                    eventKey = `authpay:${resourceId}:rejected`;
                    const preId = result.preapproval_id;
                    let rejTenant: string | undefined;
                    if (preId) {
                        try {
                            const preApproval = new PreApproval(mpClient);
                            const preDetails: any = await preApproval.get({ id: preId });
                            rejTenant = parseExtRef(preDetails.external_reference || "").tenantId;
                        } catch { /* best effort */ }
                    }
                    const { data: claimed } = await supabaseAdmin
                        .from('mp_webhook_events')
                        .upsert(
                            { event_key: eventKey, topic, resource_id: String(resourceId), tenant_id: rejTenant || null },
                            { onConflict: 'event_key', ignoreDuplicates: true }
                        )
                        .select();
                    if (claimed && claimed.length > 0 && rejTenant) {
                        await supabaseAdmin.from("admin_notifications").insert({
                            type: 'payment_rejected',
                            title: '❌ Cobro recurrente rechazado',
                            message: `Renovación rechazada para tenant ${rejTenant} — revisar estado de suscripción`,
                            tenant_id: rejTenant,
                        });
                    }
                    return NextResponse.json({ received: true }, { status: 200 });
                }
                console.log(`authorized_payment intento ${attempt} — esperando 3s...`, result.error || result.status);
                if (attempt < 3) await sleep(3000);
            }

            if (!paymentDetails) {
                // MP-05: recurso no disponible aún — responder 500 para que MP reintente más tarde
                console.warn("subscription_authorized_payment: recurso no disponible tras 3 intentos — se solicita reintento a MP");
                return NextResponse.json({ error: "Recurso no disponible, reintentar" }, { status: 500 });
            }

            transactionAmount = paymentDetails.transaction_amount || 0;
            currencyId = paymentDetails.currency_id || undefined;
            const preapprovalId = paymentDetails.preapproval_id;

            if (preapprovalId) {
                const preApproval = new PreApproval(mpClient);
                const preApprovalDetails: any = await preApproval.get({ id: preapprovalId });

                const parsed = parseExtRef(preApprovalDetails.external_reference || "");
                tenantId = parsed.tenantId || preApprovalDetails.metadata?.tenant_id;
                planId = parsed.planId || preApprovalDetails.metadata?.plan_id;
                status = "active";
                externalSubscriptionId = preapprovalId;
                eventKey = `authpay:${resourceId}`;
                if (preApprovalDetails.next_payment_date) {
                    mpNextPaymentDate = preApprovalDetails.next_payment_date;
                }
            } else {
                console.warn("subscription_authorized_payment: no preapproval_id en el pago", paymentDetails);
            }
        } else if (topic === "preapproval" || topic === "subscription_preapproval") {
            const preApproval = new PreApproval(mpClient);
            const details: any = await preApproval.get({ id: resourceId });
            console.log("PreApproval Details:", JSON.stringify(details, null, 2));

            if (details.status === "authorized") {
                const parsed = parseExtRef(details.external_reference || "");
                tenantId = parsed.tenantId || details.external_id || details.metadata?.tenant_id;
                planId = parsed.planId || details.metadata?.plan_id;
                status = "active";
                transactionAmount = details.auto_recurring?.transaction_amount || 0;
                currencyId = details.auto_recurring?.currency_id || undefined;
                externalSubscriptionId = details.id || resourceId;
                eventKey = `preapproval:${resourceId}:authorized`;

                if (details.next_payment_date) {
                    const nextPayment = new Date(details.next_payment_date).getTime();
                    const dateCreated = new Date(details.date_created).getTime();
                    const diffSeconds = Math.abs(nextPayment - dateCreated) / 1000;
                    if (diffSeconds > 60) {
                        mpNextPaymentDate = details.next_payment_date;
                    } else {
                        console.log(`PreApproval next_payment_date es placeholder (diff ${diffSeconds}s) — esperando subscription_authorized_payment para fecha real`);
                    }
                }
            } else if (details.status === "cancelled" || details.status === "paused") {
                // ============================================
                // MP-09: PreApproval cancelado o pausado
                // ============================================
                const parsed = parseExtRef(details.external_reference || "");
                const cancelTenantId = parsed.tenantId;
                eventKey = `preapproval:${resourceId}:${details.status}`;

                const { data: claimed } = await supabaseAdmin
                    .from('mp_webhook_events')
                    .upsert(
                        { event_key: eventKey, topic, resource_id: String(resourceId), tenant_id: cancelTenantId || null },
                        { onConflict: 'event_key', ignoreDuplicates: true }
                    )
                    .select();

                if (!claimed || claimed.length === 0) {
                    console.log(`Evento duplicado ignorado: ${eventKey}`);
                    return NextResponse.json({ received: true }, { status: 200 });
                }

                if (cancelTenantId) {
                    const { data: sub } = await supabaseAdmin
                        .from("subscriptions")
                        .select("external_subscription_id")
                        .eq("tenant_id", cancelTenantId)
                        .single();

                    // CRÍTICO: solo aplicar la cancelación si el preapproval cancelado
                    // es el VIGENTE. Si difiere, es el viejo de un upgrade — ignorar.
                    if (sub?.external_subscription_id === resourceId) {
                        const nuevoEstado = details.status === "paused" ? "paused" : "canceled";
                        await supabaseAdmin
                            .from("subscriptions")
                            .update({ status: nuevoEstado, updated_at: new Date().toISOString() })
                            .eq("tenant_id", cancelTenantId);

                        // NO tocar tenant.status — el cliente conserva acceso hasta
                        // que venza su período (el cron diario lo suspende).
                        const { data: cancelTenantData } = await supabaseAdmin
                            .from("tenants")
                            .select("name")
                            .eq("id", cancelTenantId)
                            .single();
                        await supabaseAdmin.from("admin_notifications").insert({
                            type: 'subscription_cancelled',
                            title: details.status === "paused" ? '⏸️ Suscripción pausada' : '🚫 Suscripción cancelada',
                            message: `${cancelTenantData?.name || cancelTenantId} — el débito automático fue ${details.status === "paused" ? 'pausado' : 'cancelado'} en MercadoPago. Acceso vigente hasta fin del período.`,
                            tenant_id: cancelTenantId,
                        });
                        console.log(`✅ MP-09: suscripción de ${cancelTenantId} marcada como ${nuevoEstado}`);
                    } else {
                        console.log(`MP-09: preapproval ${resourceId} cancelado no es el vigente de ${cancelTenantId} (vigente: ${sub?.external_subscription_id}) — es el viejo de un upgrade, ignorado`);
                    }
                }
                return NextResponse.json({ received: true }, { status: 200 });
            }
        }

        // ============================================
        // ACTIVACIÓN
        // ============================================
        if (tenantId && status === "active" && eventKey) {
            // Leer suscripción actual (para primer-pago y preapproval viejo)
            const { data: currentSub } = await supabaseAdmin
                .from("subscriptions")
                .select("status, last_payment_at, external_subscription_id")
                .eq("tenant_id", tenantId)
                .single();

            // MP-04: idempotencia real — reclamar el evento antes de procesar
            const { data: claimed, error: claimError } = await supabaseAdmin
                .from('mp_webhook_events')
                .upsert(
                    { event_key: eventKey, topic, resource_id: String(resourceId), tenant_id: tenantId },
                    { onConflict: 'event_key', ignoreDuplicates: true }
                )
                .select();

            if (claimError) {
                console.error("Error reclamando evento:", claimError);
                return NextResponse.json({ error: "Error de idempotencia" }, { status: 500 });
            }

            if (!claimed || claimed.length === 0) {
                console.log(`⚠️ Evento duplicado ignorado (idempotencia): ${eventKey}`);
                return NextResponse.json({ received: true }, { status: 200 });
            }
            eventClaimed = true;

            // MP-10: plan vacío o desconocido → revisión manual (permanente, mantener claim)
            if (!planId) {
                console.error(`MP-10: planId vacío para tenant ${tenantId} — revisión manual`);
                await supabaseAdmin.from("admin_notifications").insert({
                    type: 'manual_review',
                    title: '⚠️ Plan no identificado',
                    message: `Pago recibido de tenant ${tenantId} pero sin plan_id. Revisar manualmente.`,
                    tenant_id: tenantId,
                });
                return NextResponse.json({ received: true }, { status: 200 });
            }

            const planMapeado = mapearPlan(planId);
            if (!planMapeado) {
                console.error(`MP-10: plan desconocido "${planId}" para tenant ${tenantId} — revisión manual`);
                await supabaseAdmin.from("admin_notifications").insert({
                    type: 'manual_review',
                    title: '⚠️ Plan desconocido',
                    message: `Pago recibido de tenant ${tenantId} con plan_id desconocido: "${planId}". Revisar manualmente.`,
                    tenant_id: tenantId,
                });
                return NextResponse.json({ received: true }, { status: 200 });
            }

            const { dbSubPlan, dbTenantPlan, internalPlanId, isAnnual } = planMapeado;

            // ============================================
            // MP-06: validación de moneda e importe
            // ============================================
            if (currencyId && currencyId !== 'ARS') {
                console.error(`MP-06: moneda inválida "${currencyId}" para tenant ${tenantId} — revisión manual`);
                await supabaseAdmin.from("admin_notifications").insert({
                    type: 'manual_review',
                    title: '⚠️ Moneda inválida',
                    message: `Pago de tenant ${tenantId} en moneda ${currencyId} (se esperaba ARS). Plan: ${internalPlanId}. NO activado.`,
                    tenant_id: tenantId,
                });
                return NextResponse.json({ received: true }, { status: 200 });
            }

            const planConfig = getPlanDetails(internalPlanId);
            const precioEsperado = planConfig.price;
            const esPrimerPago = !currentSub?.last_payment_at;

            if (transactionAmount <= 0) {
                console.error(`MP-06: importe inválido $${transactionAmount} para tenant ${tenantId} — revisión manual`);
                await supabaseAdmin.from("admin_notifications").insert({
                    type: 'manual_review',
                    title: '⚠️ Importe inválido',
                    message: `Pago de tenant ${tenantId} con importe $${transactionAmount}. Plan: ${internalPlanId}. NO activado.`,
                    tenant_id: tenantId,
                });
                return NextResponse.json({ received: true }, { status: 200 });
            }

            // Importe menor al precio del plan: solo válido como primer pago (proporcional).
            // En renovaciones, un importe menor indica plan/precio desactualizado → revisión.
            if (transactionAmount < precioEsperado && !esPrimerPago) {
                console.error(`MP-06: importe $${transactionAmount} < precio del plan $${precioEsperado} en renovación de ${tenantId} — revisión manual`);
                await supabaseAdmin.from("admin_notifications").insert({
                    type: 'manual_review',
                    title: '⚠️ Importe menor al precio del plan',
                    message: `Renovación de tenant ${tenantId}: pagó $${transactionAmount.toLocaleString('es-AR')} pero el plan ${internalPlanId} cuesta $${precioEsperado.toLocaleString('es-AR')}. NO activado.`,
                    tenant_id: tenantId,
                });
                return NextResponse.json({ received: true }, { status: 200 });
            }

            // ============================================
            // ESCRITURAS CRÍTICAS — si fallan: liberar claim + 500 (MP reintenta)
            // ============================================
            const now = new Date();
            const periodStart = now;
            let periodEnd: Date;
            if (mpNextPaymentDate) {
                const parsedDate = new Date(mpNextPaymentDate);
                periodEnd = isNaN(parsedDate.getTime())
                    ? (isAnnual ? calcularProximoDiezAnual() : calcularProximoDiez())
                    : parsedDate;
            } else {
                periodEnd = isAnnual ? calcularProximoDiezAnual() : calcularProximoDiez();
            }

            const { error: subError } = await supabaseAdmin
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

            if (subError) {
                console.error("Error crítico actualizando subscription:", subError);
                await releaseClaim();
                return NextResponse.json({ error: "Error DB subscription" }, { status: 500 });
            }

            const { data: updatedTenant, error: tenantError } = await supabaseAdmin
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

            if (tenantError) {
                console.error("Error crítico actualizando tenant:", tenantError);
                await releaseClaim();
                return NextResponse.json({ error: "Error DB tenant" }, { status: 500 });
            }

            console.log(`✅ Webhook processed: tenant ${tenantId}, status=active, plan=${internalPlanId}, next_billing=${periodEnd.toISOString()} (fuente: ${mpNextPaymentDate ? 'MP' : 'fallback-dia10'}), preapproval_id=${externalSubscriptionId}`);

            // ============================================
            // MP-07 / MP-08: cancelar el PreApproval anterior si este pago
            // corresponde a uno NUEVO (upgrade completado o re-suscripción)
            // ============================================
            const oldPreapprovalId = currentSub?.external_subscription_id;
            if (
                oldPreapprovalId &&
                externalSubscriptionId &&
                oldPreapprovalId !== externalSubscriptionId
            ) {
                try {
                    const cancelResponse = await fetch(
                        `https://api.mercadopago.com/preapproval/${oldPreapprovalId}`,
                        {
                            method: "PUT",
                            headers: {
                                Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ status: "cancelled" }),
                        }
                    );
                    const cancelData = await cancelResponse.json();
                    if (cancelResponse.ok) {
                        console.log(`✅ MP-07/08: PreApproval anterior ${oldPreapprovalId} cancelado tras autorizar el nuevo ${externalSubscriptionId}`);
                    } else {
                        // No crítico (puede estar ya cancelado), pero avisar para verificar
                        console.warn(`⚠️ No se pudo cancelar PreApproval anterior ${oldPreapprovalId}:`, cancelData);
                        await supabaseAdmin.from("admin_notifications").insert({
                            type: 'manual_review',
                            title: '⚠️ Verificar PreApproval anterior',
                            message: `Tenant ${tenantId} activó nuevo débito ${externalSubscriptionId} pero no se pudo cancelar el anterior ${oldPreapprovalId}. Verificar en MP que no haya doble cobro.`,
                            tenant_id: tenantId,
                        });
                    }
                } catch (cancelErr) {
                    console.error("Error cancelando PreApproval anterior:", cancelErr);
                }
            }

            // Notificación de pago (best-effort, nunca falla el webhook por esto)
            try {
                const tenantName = updatedTenant?.name || tenantId;
                const montoStr = transactionAmount > 0
                    ? ` — $${transactionAmount.toLocaleString('es-AR')}`
                    : '';

                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                const { data: existingNotif } = await supabaseAdmin
                    .from("admin_notifications")
                    .select("id")
                    .eq("tenant_id", tenantId)
                    .eq("type", "payment_received")
                    .gte("created_at", tenMinutesAgo)
                    .single();

                if (!existingNotif) {
                    await supabaseAdmin.from("admin_notifications").insert({
                        type: 'payment_received',
                        title: '💰 Pago recibido',
                        message: `${tenantName} — plan ${internalPlanId}${montoStr}`,
                        tenant_id: tenantId,
                    });
                }
            } catch (notifError) {
                console.error("Error creando notificación:", notifError);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        // MP-05: error inesperado → liberar claim y responder 500 para que MP reintente
        console.error("Webhook processing error:", error);
        await releaseClaim();
        return NextResponse.json({ error: "Error interno, reintentar" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: "ok" });
}
