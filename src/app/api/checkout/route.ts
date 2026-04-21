import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/config/plans";

// No MercadoPago SDK needed here.
// For subscription PLANS, MP provides a ready-made checkout URL.
// We just redirect the user there with their tenant_id as external_reference.
// MP handles card entry, authorization, and sends us a webhook on success.

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // 1. Check Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "No autenticado. Por favor, reingresá a tu cuenta." },
                { status: 401 }
            );
        }

        // 2. Get tenant_id from profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.tenant_id) {
            console.error("Checkout Profile Error:", profileError);
            return NextResponse.json(
                { error: "Tu perfil no tiene un negocio asociado." },
                { status: 400 }
            );
        }

        // 3. Get plan config
        const body = await request.json();
        const { planId } = body;

        if (!planId) {
            return NextResponse.json(
                { error: "No se especificó un plan." },
                { status: 400 }
            );
        }

        const planKey = planId.toUpperCase() as keyof typeof PLANS;
        const plan = PLANS[planKey];

        if (!plan?.mercadopago_plan_id) {
            console.error(`Plan config missing for: ${planId}`, plan);
            return NextResponse.json(
                { error: `El plan '${planId}' no está configurado correctamente en el servidor.` },
                { status: 400 }
            );
        }

        // 4. Build the direct MP subscription checkout URL.
        // This is the correct approach for PreApprovalPlan:
        // MP handles the full checkout (card entry, authorization) on their side.
        const checkoutUrl = new URL("https://www.mercadopago.com.ar/subscriptions/checkout");
        checkoutUrl.searchParams.set("preapproval_plan_id", plan.mercadopago_plan_id);
        checkoutUrl.searchParams.set("external_reference", profile.tenant_id);

        console.log(`Redirecting to MP checkout: ${checkoutUrl.toString()}`);

        return NextResponse.json({
            init_point: checkoutUrl.toString(),
        });

    } catch (error: any) {
        console.error("Global Checkout Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor.", details: error.message },
            { status: 500 }
        );
    }
}
