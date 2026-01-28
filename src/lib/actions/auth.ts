'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Profile, Tenant, Subscription, UserSession } from '@/lib/types';

// Sign in with email and password
export async function signIn(email: string, password: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    // Update last login
    await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

    revalidatePath('/');
    return { error: null };
}

// Sign out
export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}

// Get current user session with profile and tenant
export async function getCurrentSession(): Promise<UserSession | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
      *,
      tenant:tenants(*),
      subscription:tenants(
        subscriptions(*)
      )
    `)
        .eq('id', user.id)
        .single();

    if (!profile) {
        return null;
    }

    // Extract subscription from nested structure
    const subscription = (profile.subscription as { subscriptions: Subscription[] })?.subscriptions?.[0];

    return {
        user: {
            id: user.id,
            email: user.email || '',
        },
        profile: profile as Profile,
        tenant: profile.tenant as Tenant,
        subscription: subscription as Subscription,
    };
}

// Check if user can perform action based on tenant status
export async function canPerformAction(): Promise<boolean> {
    const session = await getCurrentSession();

    if (!session) return false;

    return ['trial', 'active'].includes(session.tenant.status);
}

// Get current tenant settings
export async function getTenantSettings(): Promise<Tenant | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant:tenants(*)')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant) return null;

    // Handle the case where tenant might be an array or object
    const tenant = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;
    return tenant as Tenant;
}

// Update tenant settings
export async function updateTenantSettings(settings: {
    name?: string;
    low_stock_threshold_default?: number;
    address?: string;
    phone?: string;
    email?: string;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'owner') {
        return { error: 'Solo el dueño puede modificar la configuración' };
    }

    const { error } = await supabase
        .from('tenants')
        .update(settings)
        .eq('id', profile.tenant_id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/config');
    return { error: null };
}

// Create staff user (owner only)
export async function createStaffUser(
    email: string,
    password: string,
    fullName: string
) {
    const supabase = await createClient();

    // Get current user's tenant
    const session = await getCurrentSession();

    if (!session || session.profile.role !== 'owner') {
        return { error: 'Solo el dueño puede crear usuarios' };
    }

    // Note: In production, you'd use a server-side admin client
    // For MVP, staff creation would be done manually in Supabase dashboard
    // Then linked via link_user_to_tenant function

    return {
        error: null,
        message: 'Cree el usuario en Supabase Dashboard y luego vincúlelo con link_user_to_tenant'
    };
}

// Get team members (users in same tenant)
export async function getTeamMembers() {
    const supabase = await createClient();

    // First get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) {
        return { data: null, error: 'Perfil no encontrado' };
    }

    // Now get only team members from the SAME tenant
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('role')
        .order('full_name');

    if (error) {
        return { data: null, error: error.message };
    }

    return { data: data as Profile[], error: null };
}

// Update user profile
export async function updateProfile(updates: {
    full_name?: string;
    phone?: string;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/config');
    return { error: null };
}

// Get subscription status
export async function getSubscriptionStatus() {
    const session = await getCurrentSession();

    if (!session) return null;

    return {
        subscription: session.subscription,
        tenant: session.tenant,
        isActive: ['trial', 'active'].includes(session.tenant.status),
        daysRemaining: session.subscription
            ? Math.ceil((new Date(session.subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0,
    };
}

// Import business types for internal use (cannot re-export from 'use server' file)
import { type BusinessType } from '@/lib/constants/business-types';
import { seedTenantData } from './seeding';

// Sign up - Create new user with tenant
export async function signUp(data: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    businessType: BusinessType;
}) {
    const supabase = await createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
    });

    if (authError) {
        return { error: authError.message };
    }

    if (!authData.user) {
        return { error: 'Error al crear usuario' };
    }

    const userId = authData.user.id;

    // 2. Create slug from business name
    const slug = data.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString(36);

    // 3. Create tenant
    // 3. Call RPC to create tenant, profile, subscription safely
    console.log('Calling register_new_tenant RPC with:', {
        p_user_id: userId,
        p_email: data.email,
        p_business_type: data.businessType
    });

    const { data: tenantId, error: rpcError } = await supabase.rpc('register_new_tenant', {
        p_user_id: userId,
        p_email: data.email,
        p_full_name: data.fullName,
        p_business_name: data.businessName,
        p_business_type: data.businessType,
        p_slug: slug
    });

    if (rpcError) {
        console.error('RPC Error details:', rpcError);
        // Warning: The user is created in Auth but DB setup failed. 
        // In a real app we might want to clean up the auth user here.
        return { error: 'Error al registrar negocio (RPC): ' + rpcError.message };
    }

    // 6. Seed initial data based on business type
    // Import dynamically or ensure import is at top
    // tenantId is returned directly from RPC
    await seedTenantData(tenantId, data.businessType);

    revalidatePath('/');
    return { error: null };
}

