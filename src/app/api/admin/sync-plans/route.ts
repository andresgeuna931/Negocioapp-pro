import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApprovalPlan } from "mercadopago";
import { PLANS } from "@/lib/config/plans";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function GET() {
    try {
        const mpPlan = new PreApprovalPlan(client);

        // 1. CLEANUP: Fetch and cancel all existing plans to avoid duplicates
        console.log("Cleaning up old plans...");
        const existingPlans = await mpPlan.search({});
        if (existingPlans.results) {
            for (const oldPlan of existingPlans.results) {
                if (oldPlan.status !== 'cancelled') {
                    try {
                        await mpPlan.update({ 
                            id: oldPlan.id as string, 
                            status: 'cancelled' 
                        });
                        console.log(`Cancelled plan: ${oldPlan.id}`);
                    } catch (e) {
                        console.error(`Status update failed for ${oldPlan.id}`);
                    }
                }
            }
        }

        // 2. CREATE: Create the 4 fresh plans
        const results = [];
        for (const [key, plan] of Object.entries(PLANS)) {
            console.log(`Creating fresh plan for ${plan.name}...`);
            
            const response = await mpPlan.create({
                body: {
                    reason: `NegocioApp Pro - Plan ${plan.name}`,
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
