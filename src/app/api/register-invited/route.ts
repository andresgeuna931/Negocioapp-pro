import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { validateInvitationToken, markInvitationAsUsed } from "@/lib/actions/tenant-invitations";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, email, password, fullName, businessName, planId } = body;

        // 1. Validar token
        const validation = await validateInvitationToken(token);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.reason },
                { status: 400 }
            );
        }

        // 2. Cliente admin de Supabase
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError || !authData.user) {
            console.error("Auth error:", authError);
            return NextResponse.json(
                { error: authError?.message || "Error al crear el usuario" },
                { status: 400 }
            );
        }

        const userId = authData.user.id;

        // 4. Crear tenant — solo con name y status pending
        const { data: tenant, error: tenantError } = await adminSupabase
            .from("tenants")
            .insert({
                name: businessName,
                status: 'trial',
            })
            .select()
            .single();

        if (tenantError || !tenant) {
            console.error("Tenant error:", tenantError);
            await adminSupabase.auth.admin.deleteUser(userId);
            return NextResponse.json(
                { error: "Error al crear el negocio" },
                { status: 500 }
            );
        }

        // 5. Crear perfil vinculado al tenant
        const { error: profileError } = await adminSupabase
            .from("profiles")
            .insert({
                id: userId,
                tenant_id: tenant.id,
                full_name: fullName,
                email,
                role: 'owner',
            });

        if (profileError) {
            console.error("Profile error:", profileError);
            await adminSupabase.from("tenants").delete().eq("id", tenant.id);
            await adminSupabase.auth.admin.deleteUser(userId);
            return NextResponse.json(
                { error: "Error al crear el perfil" },
                { status: 500 }
            );
        }

        // 6. Crear suscripción en pending
        const { error: subError } = await adminSupabase
            .from("subscriptions")
            .insert({
                tenant_id: tenant.id,
                status: 'pending',
                plan: 'basic',
                payment_provider: 'mercadopago',
            });

        if (subError) {
            console.error("Subscription error:", subError);
            // No hacemos rollback aquí — el webhook lo va a activar igual
        }

        // 7. Marcar invitación como usada
        await markInvitationAsUsed(token, tenant.id);

        // 8. Iniciar sesión automáticamente
        const supabase = await createClient();
        await supabase.auth.signInWithPassword({ email, password });

        return NextResponse.json({
            success: true,
            tenantId: tenant.id,
        });

    } catch (error: any) {
        console.error("Register invited error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
