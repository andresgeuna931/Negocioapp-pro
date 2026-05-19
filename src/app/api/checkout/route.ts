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

        // 4. Create the PreApproval intent via MP API
        // This is CRITICAL. The static checkout URL ignores `external_reference`.
        // We MUST create it via the API so MercadoPago links the subscription to our tenant_id.
        const { MercadoPagoConfig, PreApproval } = await import("mercadopago");
        const mpClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        });

        const preApproval = new PreApproval(mpClient);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app';

        const response = await preApproval.create({
            body: {
                preapproval_plan_id: plan.mercadopago_plan_id,
                external_reference: profile.tenant_id,
                back_url: baseUrl,
                reason: `Suscripción NegocioApp Pro - ${plan.name}`,
            }
        });

        console.log(`Created MP PreApproval: ${response.id} for tenant ${profile.tenant_id}`);

        return NextResponse.json({
            init_point: response.init_point,
        });


    } catch (error: any) {
        console.error("Global Checkout Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor.", details: error.message },
            { status: 500 }
        );
    }
}
