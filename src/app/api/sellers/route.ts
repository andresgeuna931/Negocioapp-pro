// src/app/api/admin/sellers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail, referralEmailHtml } from "@/lib/brevo";

function generateReferralCode(name: string): string {
    const prefix = name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 3)
        .toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
}

function adminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// GET — listar todos los vendedores
export async function GET() {
    const supabase = adminClient();
    const { data, error } = await supabase
        .from("sellers")
        .select("id, full_name, email, referral_code, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sellers: data });
}

// POST — crear vendedor y mandar mail
export async function POST(request: NextRequest) {
    try {
        const { full_name, email } = await request.json();
        const name = full_name;

        if (!name || !email) {
            return NextResponse.json({ error: "Nombre y email son requeridos." }, { status: 400 });
        }

        const supabase = adminClient();

        // Generar código único
        let referralCode = generateReferralCode(name);
        // Verificar que no exista (reintentar si hay colisión)
        for (let i = 0; i < 5; i++) {
            const { data: existing } = await supabase
                .from("sellers")
                .select("id")
                .eq("referral_code", referralCode)
                .single();
            if (!existing) break;
            referralCode = generateReferralCode(name);
        }

        // Insertar vendedor
        const { data: seller, error: insertError } = await supabase
            .from("sellers")
            .insert({ full_name: name, email, referral_code: referralCode })
            .select()
            .single();

        if (insertError || !seller) {
            return NextResponse.json({ error: insertError?.message || "Error al crear vendedor" }, { status: 500 });
        }

        // Mandar mail con link de referido
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://negocioapp-pro.vercel.app";
        const referralLink = `${baseUrl}/registrarse?ref=${referralCode}`;

        try {
            await sendEmail({
                to: { email, name },
                subject: "Tu link de vendedor — NegocioApp Pro",
                htmlContent: referralEmailHtml(name, referralLink),
            });
        } catch (emailError) {
            console.error("Error enviando mail al vendedor:", emailError);
            // No falla la creación si el mail falla — el admin puede reenviar desde el panel
        }

        return NextResponse.json({ success: true, seller });
    } catch (error: any) {
        console.error("sellers POST error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
