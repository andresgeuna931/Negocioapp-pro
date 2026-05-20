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

        // 4. Create dynamic PreApproval via POST /preapproval
        // Using auto_recurring generates a new subscription checkout intent that respects external_reference.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app';
        
        const response = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                auto_recurring: {
                    frequency: 1,
                    frequency_type: "months",
                    transaction_amount: plan.price,
                    currency_id: "ARS"
                },
                external_reference: `${profile.tenant_id}___${plan.id}`,
                back_url: baseUrl, 
                reason: `Suscripción NegocioApp Pro - ${plan.name}`,
                payer_email: payerEmail,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("MP REST API Error:", JSON.stringify(data, null, 2));
            throw new Error(JSON.stringify(data));
        }

        console.log(`Created MP dynamic PreApproval: ${data.id} for tenant ${profile.tenant_id}`);

        if (!data.init_point) {
            throw new Error("MP API no devolvió init_point");
        }

        return NextResponse.json({
            init_point: data.init_point,
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
