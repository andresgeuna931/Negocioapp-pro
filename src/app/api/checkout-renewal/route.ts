import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, isAnnualPlan, getPlanDetails } from "@/lib/config/plans";

// POST /api/checkout-renewal
// Genera un nuevo PreApproval de MercadoPago para un tenant con suscripción vencida.
// SEGURIDAD: el tenant_id se obtiene SIEMPRE de la sesión del servidor, nunca del body.
// MP-10: sin fallback a Profesional — si no hay plan registrado, error explícito.

export async function POST(_request: NextRequest) {
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

        // 2. Obtener tenant_id y rol desde el perfil (servidor, no del body)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("tenant_id, role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.tenant_id) {
            console.error("Renewal — Profile Error:", profileError);
            return NextResponse.json(
                { error: "Tu perfil no tiene un negocio asociado." },
                { status: 400 }
            );
        }

        // Facturación restringida al dueño (auditoría Bloque 5, ítem 10)
        if (profile.role !== 'owner' && profile.role !== 'admin') {
            return NextResponse.json(
                { error: "Solo el dueño del negocio puede renovar la suscripción." },
                { status: 403 }
            );
        }

        const tenantId = profile.tenant_id;

        // 3. Leer el plan actual del tenant desde subscriptions
        //    MP-10: sin fallback — si no hay plan registrado, error explícito.
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("tenant_id", tenantId)
            .single();

        const currentPlanId: string | undefined = subscription?.plan;

        if (!currentPlanId || ['free', 'trial'].includes(currentPlanId)) {
            console.error(`Renewal — tenant ${tenantId} sin plan válido registrado (plan: ${currentPlanId})`);
            return NextResponse.json(
                { error: "No se encontró un plan anterior para renovar. Contactá a soporte para reactivar tu cuenta." },
                { status: 400 }
            );
        }

        // 4. Resolver la config del plan
        const planKey = currentPlanId.toUpperCase() as keyof typeof PLANS;
        const plan = PLANS[planKey] ?? getPlanDetails(currentPlanId);

        if (!plan?.mercadopago_plan_id) {
            console.error(`Renewal — plan config missing for: ${currentPlanId}`, plan);
            return NextResponse.json(
                { error: `El plan '${currentPlanId}' no está configurado correctamente.` },
                { status: 400 }
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://negocioapp-pro.vercel.app";
        const annual = isAnnualPlan(currentPlanId);

        // 5. Armar el body para MP (mismo formato que /api/checkout)
        const mpBody: Record<string, any> = {
            auto_recurring: {
                frequency: 1,
                frequency_type: annual ? "years" : "months",
                transaction_amount: plan.price,
                currency_id: "ARS",
            },
            external_reference: `${tenantId}___${plan.id}`,
            // back_url con query param para que el cliente sepa el resultado
            back_url: `${baseUrl}?renewal=1`,
            reason: annual
                ? `Renovación Anual NegocioApp Pro - ${plan.name}`
                : `Renovación NegocioApp Pro - ${plan.name}`,
            payer_email: payerEmail,
        };

        // 6. Crear PreApproval en MercadoPago
        const response = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(mpBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Renewal — MP REST API Error:", JSON.stringify(data, null, 2));
            throw new Error(JSON.stringify(data));
        }

        if (!data.init_point) {
            throw new Error("MP API no devolvió init_point");
        }

        console.log(
            `✅ Renewal PreApproval created: ${data.id} | tenant: ${tenantId} | plan: ${currentPlanId}`
        );

        return NextResponse.json({ init_point: data.init_point });

    } catch (error: any) {
        console.error("Renewal — Global Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor.", details: error?.message },
            { status: 500 }
        );
    }
}
