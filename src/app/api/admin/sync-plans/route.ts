import { NextResponse } from "next/server";

// Este endpoint fue desactivado por seguridad.
// Era un endpoint destructivo público que cancelaba todos los planes de MercadoPago.
// Para sincronizar planes, usar el script administrativo local.
export async function GET() {
    return NextResponse.json(
        { error: "Este endpoint ha sido desactivado." },
        { status: 410 }
    );
}
