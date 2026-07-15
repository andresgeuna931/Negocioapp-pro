'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from './auth';
import { UserRole } from '@/lib/types';

// Roles que un owner puede asignar dentro de su tenant
// 'admin' es un rol de sistema global — nunca puede ser asignado por un tenant
const TENANT_ASSIGNABLE_ROLES: UserRole[] = ['staff', 'owner'];

// Generate an invite link for a new team member
export async function generateInviteLink(role: UserRole = 'staff') {
    const supabase = await createClient();

    // Verify current user is owner
    const session = await getCurrentSession();
    if (!session || session.profile.role !== 'owner') {
        return { error: 'Solo el dueño puede invitar usuarios' };
    }

    // BL-01: Validar que el rol solicitado es asignable por un tenant
    if (!TENANT_ASSIGNABLE_ROLES.includes(role)) {
        return { error: 'Rol no permitido' };
    }

    const tenantId = session.profile.tenant_id;

    // Create invitation record (no email needed — the link is generic)
    const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
            tenant_id: tenantId,
            email: 'pending', // Will be filled when employee registers
            full_name: 'pending',
            role: role,
            invited_by: session.user.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

    if (inviteError) {
        console.error('Invitation error:', inviteError);
        return { error: 'Error al crear invitación. Contactá al soporte.' };
    }

    // Build the invite URL using the invitation UUID as token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app';
    const inviteUrl = `${baseUrl}/unirse/${invitation.id}`;

    revalidatePath('/config');
    return {
        error: null,
        inviteUrl,
        message: 'Link de invitación generado'
    };
}

// Get invitation details by token (for the join page)
export async function getInvitationByToken(token: string) {
    const supabase = await createClient();

    const { data: invitation, error } = await supabase
        .from('team_invitations')
        .select('*, tenant:tenants(name)')
        .eq('id', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !invitation) {
        return { data: null, error: 'Invitación no encontrada o expirada' };
    }

    const tenantData = Array.isArray(invitation.tenant) ? invitation.tenant[0] : invitation.tenant;
    const businessName = (tenantData as { name: string } | null)?.name || 'Negocio';

    return {
        data: {
            id: invitation.id,
            role: invitation.role,
            businessName,
            expires_at: invitation.expires_at,
        },
        error: null
    };
}

// Register a new user via invite link and join the team
export async function joinTeamViaInvite(data: {
    token: string;
    email: string;
    password: string;
    fullName: string;
}) {
    const supabase = await createClient();
    const email = data.email.trim().toLowerCase();

    // 1. Verify invitation is valid
    const { data: invitation, error: invError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', data.token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

    if (invError || !invitation) {
        return { error: 'La invitación ya no es válida o expiró.' };
    }

    // 2. Check if email already exists in this tenant
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', invitation.tenant_id)
        .maybeSingle();

    if (existingProfile) {
        return { error: 'Este email ya está registrado en este negocio.' };
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: data.password,
        options: { data: { full_name: data.fullName } }
    });

    if (authError) {
        return { error: authError.message };
    }

    if (!authData.user) {
        return { error: 'Error al crear la cuenta.' };
    }

    // 4. Create profile linked to the owner's tenant
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: authData.user.id,
            tenant_id: invitation.tenant_id,
            role: invitation.role,
            full_name: data.fullName.trim(),
            email: email,
            is_active: true
        });

    if (profileError) {
        console.error('Error creating linked profile:', profileError);
        return { error: 'Error al vincular con el equipo: ' + profileError.message };
    }

    // 5. Mark invitation as accepted and update with actual user info
    await supabase
        .from('team_invitations')
        .update({
            status: 'accepted',
            email: email,
            full_name: data.fullName.trim(),
            updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

    return { error: null };
}

// Toggle user active status
export async function toggleUserActive(userId: string, newStatus: boolean) {
    const supabase = await createClient();

    // Verify current user is owner
    const session = await getCurrentSession();
    if (!session || session.profile.role !== 'owner') {
        return { error: 'Solo el dueño puede gestionar usuarios' };
    }

    // Can't deactivate yourself
    if (userId === session.user.id) {
        return { error: 'No podés desactivarte a vos mismo' };
    }

    // Verify target user is in same tenant
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();

    if (!targetProfile || targetProfile.tenant_id !== session.profile.tenant_id) {
        return { error: 'Usuario no encontrado' };
    }

    // Update user status
    const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/config');
    return { error: null };
}

// Change user role
export async function changeUserRole(userId: string, newRole: UserRole) {
    const supabase = await createClient();

    // Verify current user is owner
    const session = await getCurrentSession();
    if (!session || session.profile.role !== 'owner') {
        return { error: 'Solo el dueño puede cambiar roles' };
    }

    // BL-01: Validar que el rol solicitado es asignable por un tenant
    if (!TENANT_ASSIGNABLE_ROLES.includes(newRole)) {
        return { error: 'Rol no permitido' };
    }

    // Can't change your own role
    if (userId === session.user.id) {
        return { error: 'No podés cambiar tu propio rol' };
    }

    // Verify target user is in same tenant
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();

    if (!targetProfile || targetProfile.tenant_id !== session.profile.tenant_id) {
        return { error: 'Usuario no encontrado' };
    }

    // Update user role
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/config');
    return { error: null };
}

// Get pending invitations for tenant
export async function getPendingInvitations() {
    const supabase = await createClient();

    const session = await getCurrentSession();
    if (!session) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('tenant_id', session.profile.tenant_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

// Cancel an invitation
export async function cancelInvitation(invitationId: string) {
    const supabase = await createClient();

    const session = await getCurrentSession();
    if (!session || session.profile.role !== 'owner') {
        return { error: 'Solo el dueño puede cancelar invitaciones' };
    }

    const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .eq('tenant_id', session.profile.tenant_id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/config');
    return { error: null };
}
