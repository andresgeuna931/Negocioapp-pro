import { NextRequest, NextResponse } from "next/server";
import { checkExpiringSubscriptions } from "@/lib/actions/admin-notifications";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createTenantNotification, tenantNotificationExists } from "@/lib/actions/tenant-notifications";

// Endpoint llamado diariamente por Vercel Cron (configurado en vercel.json)
// Detecta suscripciones próximas a vencer y vencidas, y crea notificaciones admin y tenant
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        // Notificaciones para el admin
        await checkExpiringSubscriptions();

        // Notificaciones para los tenants: suscripción próxima a vencer en 3 días
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const { data: expiring } = await adminSupabase
            .from('subscriptions')
            .select('tenant_id, current_period_end')
            .eq('status', 'active')
            .gte('current_period_end', now.toISOString())
            .lte('current_period_end', in3Days.toISOString());

        for (const sub of (expiring || [])) {
            const fechaVto = new Date(sub.current_period_end).toLocaleDateString('es-AR');
            const alreadyNotified = await tenantNotificationExists(
                sub.tenant_id,
                'subscription_expiring'
            );

            if (!alreadyNotified) {
                await createTenantNotification(
                    sub.tenant_id,
                    'subscription_expiring',
                    '⚠️ Próximo cobro',
                    `Tu suscripción se renueva el ${fechaVto}. Asegurate de tener fondos disponibles.`
                );
            }
        }

        console.log("✅ Cron check-subscriptions ejecutado correctamente");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Cron check-subscriptions error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
