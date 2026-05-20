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

        // 1. Check Auth & Get profile
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "No autenticado. Por favor, reingresá a tu cuenta." },
                { status: 401 }
            );
        }
        
        const payerEmail = user.email;
        if (!payerEmail) {
            return NextResponse.json({ error: "Email de usuario no encontrado" }, { status: 400 });
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

        // 4. Obtener el init_point del plan directamente (GET /preapproval_plan/{id})
        // As per Claude's instructions, this avoids the card_token_id requirement completely
        // while allowing us to append external_reference and payer_email to the official link.
        const response = await fetch(
            `https://api.mercadopago.com/preapproval_plan/${plan.mercadopago_plan_id}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                },
            }
        );

        const planData = await response.json();

        if (!response.ok) {
            console.error("MP Plan Fetch Error:", JSON.stringify(planData, null, 2));
            throw new Error(JSON.stringify(planData));
        }

        if (!planData.init_point) {
            throw new Error("MP API no devolvió init_point para el plan");
        }

        // We use the composite external_reference to be safe with the webhook
        const compositeRef = `${profile.tenant_id}___${plan.id}`;
        
        // Append our tracking data to the official init_point
        // Note: URL object is safer to handle query params appending
        const checkoutUrl = new URL(planData.init_point);
        checkoutUrl.searchParams.set('external_reference', compositeRef);
        checkoutUrl.searchParams.set('payer_email', payerEmail);

        console.log(`Generated MP Checkout URL: ${checkoutUrl.toString()} for tenant ${profile.tenant_id}`);

        return NextResponse.json({
            init_point: checkoutUrl.toString(),
        });
    } catch (error: any) {
        console.error("Global Checkout Error:", error);
        console.error("MP Error status:", error?.status);
        console.error("MP Error cause:", JSON.stringify(error?.cause, null, 2));
        return NextResponse.json(
            { error: "Error interno del servidor.", details: error?.message },
            { status: 500 }
        );
    }
}
