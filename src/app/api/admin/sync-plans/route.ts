import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApprovalPlan } from "mercadopago";
import { PLANS } from "@/lib/config/plans";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function GET() {
    try {
        const results = [];
        const mpPlan = new PreApprovalPlan(client);

        for (const [key, plan] of Object.entries(PLANS)) {
            console.log(`Creating plan for ${plan.name}...`);
            
            const response = await mpPlan.create({
                body: {
                    reason: `Suscripción NegocioApp Pro - Plan ${plan.name}`,
                    back_url: "https://negocioapp-pro.vercel.app/dashboard",
                    auto_recurring: {
                        frequency: 1,
                        frequency_type: "months",
                        transaction_amount: plan.price,
                        currency_id: "ARS",
                        free_trial: {
                            frequency: 14,
                            frequency_type: "days"
                        }
                    }
                }
            });

            results.push({
                name: plan.name,
                mp_id: response.id,
                init_point: response.init_point
            });
        }

        return NextResponse.json({ 
            message: "Planes creados exitosamente en MercadoPago",
            instrucciones: "Copia los IDs 'mp_id' y ponelos en las variables de entorno de Vercel.",
            planes: results 
        });

    } catch (error: any) {
        console.error("Sync error:", error);
        return NextResponse.json({ 
            error: "Fallo al crear planes en MercadoPago",
            details: error.message 
        }, { status: 500 });
    }
}
