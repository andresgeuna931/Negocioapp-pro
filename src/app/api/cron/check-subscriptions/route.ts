import { NextRequest, NextResponse } from "next/server";
import { checkExpiringSubscriptions } from "@/lib/actions/admin-notifications";

// Endpoint llamado diariamente por Vercel Cron (configurado en vercel.json)
// Detecta suscripciones próximas a vencer y vencidas, y crea notificaciones admin
export async function GET(request: NextRequest) {
    // Si CRON_SECRET está configurado en Vercel, validar el header de autorización
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        await checkExpiringSubscriptions();
        console.log("✅ Cron check-subscriptions ejecutado correctamente");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Cron check-subscriptions error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
