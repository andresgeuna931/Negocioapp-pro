import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/subscription-status
// Devuelve el estado actual del tenant autenticado.
// Usado por el polling en la pantalla "Procesando tu pago..." para detectar
// cuando el webhook de MercadoPago activó la suscripción.

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "No autenticado." }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: "Sin tenant." }, { status: 400 });
        }

        const { data: tenant } = await supabase
            .from("tenants")
            .select("status")
            .eq("id", profile.tenant_id)
            .single();

        return NextResponse.json({
            status: tenant?.status ?? "unknown",
            active: tenant?.status === "active",
        });

    } catch (error: any) {
        console.error("subscription-status error:", error);
        return NextResponse.json({ error: "Error interno." }, { status: 500 });
    }
}
