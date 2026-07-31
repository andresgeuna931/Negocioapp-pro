'use server';

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/actions/auth";
import { PLANS, PlanId } from "@/lib/config/plans";

// ─── GENERAR INVITACIÓN (solo admin) ─────────────────────────────────────────
export async function createTenantInvitation(planId: PlanId, notes?: string) {
    const session = await requireAdmin();
    const supabase = await createClient();

    const plan = PLANS[planId.toUpperCase() as keyof typeof PLANS];
    if (!plan) {
        return { error: "Plan inválido." };
    }

    const billing = plan.id.endsWith('_annual') ? 'annual' : 'monthly';

    const { data, error } = await supabase
        .from("tenant_invitations")
        .insert({
            plan_id: plan.id,
            billing,
            created_by: session!.user.id,
            notes: notes || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creando invitación:", error);
        return { error: "Error al crear la invitación." };
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unirse/${data.token}`;

    return { success: true, token: data.token, url: inviteUrl, data };
}

// ─── VALIDAR TOKEN (público — usa admin client para bypassear RLS) ────────────
export async function validateInvitationToken(token: string) {
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminSupabase
        .from("tenant_invitations")
        .select("*")
        .eq("token", token)
        .single();

    if (error || !data) {
        return { valid: false, reason: "Invitación no encontrada." };
    }

    if (data.used_at) {
        if (data.used_by_tenant_id) {
            const { data: tenant } = await adminSupabase
                .from("tenants")
                .select("status")
                .eq("id", data.used_by_tenant_id)
                .single();
            if (tenant && (tenant.status === "active" || tenant.status === "trial")) {
                return { valid: false, reason: "already_registered" };
            }
        }
        return { valid: false, reason: "Esta invitación ya fue utilizada." };
    }

    if (new Date(data.expires_at) < new Date()) {
        return { valid: false, reason: "Esta invitación venció. Pedí un nuevo link." };
    }

    const plan = PLANS[data.plan_id.toUpperCase() as keyof typeof PLANS];

    return {
        valid: true,
        invitation: data,
        plan,
    };
}

// ─── LISTAR INVITACIONES (solo admin) ────────────────────────────────────────
export async function listTenantInvitations() {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return { error: "Error al obtener invitaciones." };
    }

    return { success: true, invitations: data };
}

// ─── REVOCAR INVITACIÓN (solo admin) ─────────────────────────────────────────
export async function revokeInvitation(id: string) {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
        .from("tenant_invitations")
        .delete()
        .eq("id", id)
        .is("used_at", null);

    if (error) {
        return { error: "Error al eliminar la invitación." };
    }

    return { success: true };
}
