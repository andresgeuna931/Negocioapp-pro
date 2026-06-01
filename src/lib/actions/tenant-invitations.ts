'use server';

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLANS, PlanId } from "@/lib/config/plans";

// ─── GENERAR INVITACIÓN (solo admin) ─────────────────────────────────────────
export async function createTenantInvitation(planId: PlanId, notes?: string) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "No autenticado." };
    }

    const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    if (user.id !== ADMIN_USER_ID) {
        return { error: "No tenés permisos para generar invitaciones." };
    }

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
            created_by: user.id,
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

// ─── VALIDAR TOKEN (público — para la página /unirse/[token]) ────────────────
export async function validateInvitationToken(token: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*")
        .eq("token", token)
        .single();

    if (error || !data) {
        return { valid: false, reason: "Invitación no encontrada." };
    }

    if (data.used_at) {
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

// ─── MARCAR COMO USADA — usa cliente admin para evitar problemas de sesión ───
export async function markInvitationAsUsed(token: string, tenantId: string) {
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminSupabase
        .from("tenant_invitations")
        .update({
            used_at: new Date().toISOString(),
            used_by_tenant_id: tenantId,
        })
        .eq("token", token);

    if (error) {
        console.error("Error marcando invitación como usada:", error);
        return { error: "Error al actualizar la invitación." };
    }

    return { success: true };
}

// ─── LISTAR INVITACIONES (solo admin) ────────────────────────────────────────
export async function listTenantInvitations() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "No autenticado." };
    }

    const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return { error: "Error al obtener invitaciones." };
    }

    return { success: true, invitations: data };
}

// ─── REVOCAR INVITACIÓN — elimina directamente el registro ───────────────────
export async function revokeInvitation(id: string) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "No autenticado." };
    }

    const { error } = await supabase
        .from("tenant_invitations")
        .delete()
        .eq("id", id)
        .is("used_at", null); // Solo elimina si no fue usada realmente

    if (error) {
        return { error: "Error al eliminar la invitación." };
    }

    return { success: true };
}
