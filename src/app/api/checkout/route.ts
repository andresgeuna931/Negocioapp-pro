"use server";

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { getPlanDetails } from "@/lib/config/plans";

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

        const plan = getPlanDetails(planId);

        // Create MercadoPago Preference
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: planId,
                        title: `NegocioApp Pro - Plan ${plan.name}`,
                        description: plan.description,
                        quantity: 1,
                        unit_price: plan.price,
                        currency_id: "ARS",
                    },
                ],
                external_reference: profile.tenant_id,
                metadata: {
                    plan_id: planId,
                    tenant_id: profile.tenant_id,
                },
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app'}/dashboard?payment=success`,
                    failure: `${process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app'}/precios?payment=failed`,
                    pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app'}/precios?payment=pending`,
                },
                auto_return: "approved",
                notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app'}/api/webhooks/mercadopago`,
            },
        });

        // Return the init_point URL for redirect
        return NextResponse.json({
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point,
        });

    } catch (error) {
        console.error("Error creating checkout preference:", error);
        return NextResponse.json(
            { error: "Error interno al crear preferencia de pago" },
            { status: 500 }
        );
    }
}
