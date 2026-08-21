// src/app/api/admin/sellers/[id]/resend-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail, referralEmailHtml } from "@/lib/brevo";

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: seller, error } = await supabase
            .from("sellers")
            .select("id, full_name, email, referral_code")
            .eq("id", params.id)
            .single();

        if (error || !seller) {
            return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://negocioapp-pro.vercel.app";
        const referralLink = `${baseUrl}/registrarse?ref=${seller.referral_code}`;

        await sendEmail({
            to: { email: seller.email, name: seller.full_name },
            subject: "Tu link de vendedor — NegocioApp Pro",
            htmlContent: referralEmailHtml(seller.full_name, referralLink),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("resend-email error:", error);
        return NextResponse.json({ error: "Error al reenviar mail" }, { status: 500 });
    }
}
