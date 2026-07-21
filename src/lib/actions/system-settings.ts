'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
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
