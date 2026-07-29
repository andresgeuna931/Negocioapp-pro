'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';

function getAdmin() {
    return createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function getMaintenanceMode(): Promise<boolean> {
    const supabase = getAdmin();
    const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
    return data?.value === 'true';
}

export async function setMaintenanceMode(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    await requireAdmin();
    const supabase = getAdmin();
    const { error } = await supabase
        .from('system_settings')
        .update({ value: String(enabled), updated_at: new Date().toISOString() })
        .eq('key', 'maintenance_mode');

    if (error) {
        console.error('Error setting maintenance mode:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getAnnouncement(): Promise<string> {
    const supabase = getAdmin();
    const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'announcement')
        .single();
    return data?.value || '';
}

export async function setAnnouncement(text: string): Promise<{ success: boolean; error?: string }> {
    await requireAdmin();
    const supabase = getAdmin();
    const { error } = await supabase
        .from('system_settings')
        .update({ value: text.trim(), updated_at: new Date().toISOString() })
        .eq('key', 'announcement');

    if (error) {
        console.error('Error setting announcement:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/');
    return { success: true };
}

export async function getAllowStaffPriceLists(): Promise<boolean> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return false;

    const admin = getAdmin();
    const { data } = await admin
        .from('tenants')
        .select('allow_staff_price_lists')
        .eq('id', profile.tenant_id)
        .single();

    return data?.allow_staff_price_lists === true;
}

export async function setAllowStaffPriceLists(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: 'Tenant no encontrado' };

    const admin = getAdmin();
    const { error } = await admin
        .from('tenants')
        .update({ allow_staff_price_lists: enabled })
        .eq('id', profile.tenant_id);

    if (error) {
        console.error('Error setting allow_staff_price_lists:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/config');
    revalidatePath('/ventas');
    return { success: true };
}
