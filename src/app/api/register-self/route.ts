import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { CATEGORIES_BY_BUSINESS_TYPE } from "@/lib/constants/business-types";
import { PLANS, isAnnualPlan } from "@/lib/config/plans";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        + '-' + Math.random().toString(36).substring(2, 7);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, fullName, businessName, businessType, planId, referralCode } = body;

        if (!email || !password || !fullName || !businessName || !planId) {
            return NextResponse.json(
                { error: "Faltan datos requeridos." },
                { status: 400 }
            );
        }

        // 1. Admin client (bypasses RLS)
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Verificar plan válido
        const planKey = planId.toUpperCase() as keyof typeof PLANS;
        const plan = PLANS[planKey];
        if (!plan?.mercadopago_plan_id) {
            return NextResponse.json(
                { error: `Plan '${planId}' no configurado.` },
                { status: 400 }
            );
        }

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

        // 4. Crear tenant
        const slug = generateSlug(businessName);
        const { data: tenant, error: tenantError } = await adminSupabase
            .from("tenants")
            .insert({
                name: businessName,
                slug,
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

        // 5. Crear perfil
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

        // 6. Crear suscripción inicial en trial
        await adminSupabase
            .from("subscriptions")
            .insert({
                tenant_id: tenant.id,
                status: 'trial',
                plan: 'starter',
                payment_provider: 'mercadopago',
            });

        // 7. Categorías base
        const categoryNames = CATEGORIES_BY_BUSINESS_TYPE[businessType || 'kiosco']
            ?? CATEGORIES_BY_BUSINESS_TYPE['kiosco'];

        await adminSupabase
            .from("categories")
            .insert(categoryNames.map((name: string) => ({ tenant_id: tenant.id, name })));

        // 8. Referral code — vincular con vendedor si existe
        if (referralCode) {
            const { data: seller } = await adminSupabase
                .from("sellers")
                .select("id")
                .eq("referral_code", referralCode.toUpperCase())
                .single();

            if (seller) {
                await adminSupabase
                    .from("tenants")
                    .update({ referred_by_seller_id: seller.id })
                    .eq("id", tenant.id);
            }
        }

        // 9. Notificación admin
        await adminSupabase.from("admin_notifications").insert({
            type: 'new_tenant',
            title: '🎉 Nuevo negocio registrado (auto)',
            message: `${businessName} (${email}) — plan ${planId}`,
            tenant_id: tenant.id,
        });

        // 10. Crear PreApproval en MP
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app';
        const annual = isAnnualPlan(planId);

        const mpBody = {
            auto_recurring: {
                frequency: 1,
                frequency_type: annual ? "years" : "months",
                transaction_amount: plan.price,
                currency_id: "ARS"
            },
            external_reference: `${tenant.id}___${plan.id}`,
            back_url: `${baseUrl}/bienvenido`,
            reason: `Suscripción NegocioApp Pro - ${plan.name}`,
            payer_email: email,
        };

        const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mpBody),
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok || !mpData.init_point) {
            console.error("MP error en register-self:", mpData);
            // El tenant ya fue creado — devolvemos tenantId igual para que el cliente pueda
            // intentar el checkout desde el panel después de loguearse.
            return NextResponse.json({
                success: true,
                tenantId: tenant.id,
                init_point: null,
                warning: "No se pudo generar el link de pago. Podés activar tu suscripción desde el panel.",
            });
        }

        return NextResponse.json({
            success: true,
            tenantId: tenant.id,
            init_point: mpData.init_point,
        });

    } catch (error: any) {
        console.error("Register-self error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
