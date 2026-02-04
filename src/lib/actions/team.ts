'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from './auth';
import { UserRole } from '@/lib/types';

// Invite a new staff user to the tenant
export async function inviteStaffUser(
    email: string,
    fullName: string,
    role: UserRole = 'staff'
) {
    const supabase = await createClient();

    // Verify current user is owner
    const session = await getCurrentSession();
    if (!session || session.profile.role !== 'owner') {
        return { error: 'Solo el dueño puede invitar usuarios' };
    }

    const tenantId = session.profile.tenant_id;

    // Check if user already exists in this tenant
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .single();

    if (existingProfile) {
        return { error: 'Este email ya está registrado en tu negocio' };
    }

    // Check if user exists in auth but different tenant
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('email', email)
        .single();

    if (existingUser && existingUser.tenant_id !== tenantId) {
        return { error: 'Este email ya está registrado en otro negocio' };
    }

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
            tenant_id: tenantId,
            email: email.toLowerCase().trim(),
            full_name: fullName.trim(),
            role: role,
            invited_by: session.user.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

    if (inviteError) {
        // Table might not exist yet, create simpler approach
        // For MVP: Create user directly with temporary password
        console.error('Invitation error:', inviteError);
        return { error: 'Error al crear invitación. Contactá al soporte.' };
    }

    // TODO: Send invitation email
    // For now, we'll just create the invitation record
    // The invited user will need to register and the system will link them

    revalidatePath('/config');
    return {
        error: null,
        invitation,
        message: 'Invitación creada. El usuario debe registrarse con este email.'
    };
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
