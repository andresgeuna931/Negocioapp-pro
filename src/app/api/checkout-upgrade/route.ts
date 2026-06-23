import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlanDetails, isAnnualPlan } from "@/lib/config/plans";

// Orden de planes para validar que solo se permite upgrade (no downgrade)
const PLAN_ORDER: Record<string, number> = {
    starter: 1,
    professional: 2,
    professional_annual: 2,
    business: 3,
    business_annual: 3,
};

// POST /api/checkout-upgrade
// Cancela el PreApproval actual y crea uno nuevo con el plan solicitado.
// SEGURIDAD: tenant_id se obtiene de la sesión del servidor, nunca del body.
// ORDEN: primero crea el nuevo PreApproval, después cancela el viejo.
//        Si algo falla, el cliente nunca queda sin suscripción.

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "No autenticado. Por favor, reingresá a tu cuenta." },
                { status: 401 }
            );
        }

        const payerEmail = user.email;
        if (!payerEmail) {
            return NextResponse.json({ error: "Email de usuario no encontrado." }, { status: 400 });
        }

        // 2. Leer planId del body (el único dato que viene del cliente)
        const body = await request.json();
        const { planId } = body;
        if (!planId) {
            return NextResponse.json({ error: "planId requerido." }, { status: 400 });
        }

        // 3. Obtener tenant_id desde el perfil (servidor, no del body)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.tenant_id) {
            return NextResponse.json({ error: "Tu perfil no tiene un negocio asociado." }, { status: 400 });
        }

        const tenantId = profile.tenant_id;

        // 4. Leer suscripción actual para obtener el plan y el PreApproval viejo
        const { data: currentSub } = await supabase
            .from("subscriptions")
            .select("plan, external_subscription_id, status")
            .eq("tenant_id", tenantId)
            .single();

        if (!currentSub || currentSub.status !== "active") {
            return NextResponse.json(
                { error: "No tenés una suscripción activa para cambiar de plan." },
                { status: 400 }
            );
        }

        const currentPlanId = currentSub.plan || "starter";
        const oldPreapprovalId = currentSub.external_subscription_id;

        // 5. Validar que es un upgrade (no downgrade)
        const currentOrder = PLAN_ORDER[currentPlanId] ?? 0;
        const newOrder = PLAN_ORDER[planId] ?? 0;

        if (newOrder <= currentOrder) {
            return NextResponse.json(
                { error: `No podés cambiar del plan '${currentPlanId}' al plan '${planId}'. Solo se permiten upgrades.` },
                { status: 400 }
            );
        }

        // 6. Resolver config del plan nuevo
        const plan = getPlanDetails(planId);
        if (!plan) {
            return NextResponse.json({ error: `Plan '${planId}' no encontrado.` }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://negocioapp-pro.vercel.app";
        const annual = isAnnualPlan(planId);

        // 7. PRIMERO crear el nuevo PreApproval (si esto falla, el viejo sigue activo — seguro)
        const mpBody = {
            auto_recurring: {
                frequency: 1,
                frequency_type: annual ? "years" : "months",
                transaction_amount: plan.price,
                currency_id: "ARS",
            },
            external_reference: `${tenantId}___${plan.id}`,
            back_url: `${baseUrl}?upgrade=1`,
            reason: annual
                ? `Upgrade Anual NegocioApp Pro - ${plan.name}`
                : `Upgrade NegocioApp Pro - ${plan.name}`,
            payer_email: payerEmail,
        };

        const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(mpBody),
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok || !mpData.init_point) {
            console.error("Upgrade — MP Error al crear nuevo PreApproval:", JSON.stringify(mpData));
            throw new Error(JSON.stringify(mpData));
        }

        console.log(`✅ Upgrade nuevo PreApproval creado: ${mpData.id} | tenant: ${tenantId} | plan: ${planId}`);

        // 8. DESPUÉS cancelar el PreApproval viejo (si esto falla, no es crítico — el webhook
        //    del nuevo pago va a actualizar la suscripción de todas formas)
        if (oldPreapprovalId) {
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
                    console.log(`✅ PreApproval viejo cancelado: ${oldPreapprovalId}`);
                } else {
                    console.warn(`⚠️ No se pudo cancelar PreApproval viejo ${oldPreapprovalId}:`, cancelData);
                }
            } catch (cancelErr) {
                // No bloquear el flujo si la cancelación falla
                console.error("Error cancelando PreApproval viejo:", cancelErr);
            }
        }

        return NextResponse.json({ init_point: mpData.init_point });

    } catch (error: any) {
        console.error("Upgrade — Error global:", error);
        return NextResponse.json(
            { error: "Error interno del servidor.", details: error?.message },
            { status: 500 }
        );
    }
}
