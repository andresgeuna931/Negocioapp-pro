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

        // 1. Check Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("Checkout Auth Error:", authError);
            return NextResponse.json({ error: "No autenticado. Por favor, reingresá a tu cuenta." }, { status: 401 });
        }

        // 2. Check Profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.tenant_id) {
            console.error("Checkout Profile Error:", profileError);
            return NextResponse.json({ error: "Tu perfil de usuario no tiene un negocio asociado." }, { status: 400 });
        }

        // 3. Check Plan
        const body = await request.json();
        const { planId } = body;
        if (!planId) return NextResponse.json({ error: "No se especificó un plan." }, { status: 400 });

        const planKey = planId.toUpperCase() as keyof typeof PLANS;
        const plan = PLANS[planKey];

        if (!plan || !plan.mercadopago_plan_id) {
            console.error(`Checkout Plan Config Error: ${planId}`, plan);
            return NextResponse.json({ 
                error: `El ID de MercadoPago para el plan '${planId}' no está configurado.` 
            }, { status: 400 });
        }

        // 4. MercadoPago Call
        console.log(`Starting MP checkout for plan ${planId} (MP ID: ${plan.mercadopago_plan_id})...`);
        const preApproval = new PreApproval(client);
        
        try {
            const result: any = await preApproval.create({
                body: {
                    preapproval_plan_id: plan.mercadopago_plan_id,
                    reason: `NegocioApp Pro - Plan ${plan.name}`,
                    external_reference: profile.tenant_id,
                    back_url: "https://negocioapp-pro.vercel.app/",
                    status: "authorized"
                }
            });

            return NextResponse.json({
                init_point: result.init_point,
                sandbox_init_point: result.sandbox_init_point || null,
            });
        } catch (mpError: any) {
            console.error("MercadoPago SDK Error:", mpError);
            return NextResponse.json({ 
                error: "MercadoPago rechazó la suscripción.",
                details: mpError.message || "Error desconocido del SDK"
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Global Checkout Error:", error);
        return NextResponse.json(
            { error: "Fallo crítico en el servidor", details: error.message },
            { status: 500 }
        );
    }
}
