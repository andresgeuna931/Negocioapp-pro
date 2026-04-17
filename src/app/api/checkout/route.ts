import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/config/plans";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Validate session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Get tenant ID from profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
        }

        // Get requested plan
        const body = await request.json();
        const { planId } = body;

        if (!planId) {
            return NextResponse.json({ error: "Plan no especificado" }, { status: 400 });
        }

        // Find the PLAN object to get the mercadopago_plan_id
        const planKey = planId.toUpperCase() as keyof typeof PLANS;
        const plan = PLANS[planKey];

        if (!plan || !plan.mercadopago_plan_id) {
            console.error(`Plan not found or missing MP ID for: ${planId}`);
            return NextResponse.json({ error: "Configuración de plan inválida" }, { status: 400 });
        }

        // Create MercadoPago PreApproval (Subscription)
        const preApproval = new PreApproval(client);
        
        const result = await preApproval.create({
            body: {
                preapproval_plan_id: plan.mercadopago_plan_id,
                reason: `NegocioApp Pro - Plan ${plan.name}`,
                external_reference: profile.tenant_id,
                payer_email: user.email,
                back_url: "https://negocioapp-pro.vercel.app/",
                auto_return: "approved",
                status: "authorized"
            }
        });

        // For PreApproval, we use init_point just like Preferences
        return NextResponse.json({
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point,
        });

    } catch (error: any) {
        console.error("Error creating subscription:", error);
        return NextResponse.json(
            { error: "Error interno al crear el flujo de suscripción", details: error.message },
            { status: 500 }
        );
    }
}
