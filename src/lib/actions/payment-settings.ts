'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/lib/actions/auth';

export interface PaymentSettings {
    id?: string;
    tenant_id: string;
    debit_surcharge: number;
    credit_1_surcharge: number;
    credit_3_surcharge: number;
}

export async function getPaymentSettings(): Promise<{ data: PaymentSettings | null; error: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return { data: null, error: 'Sin negocio asociado' };

    const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (error) {
        // No settings yet — return defaults
        return {
            data: {
                tenant_id: profile.tenant_id,
                debit_surcharge: 0,
                credit_1_surcharge: 0,
                credit_3_surcharge: 0,
            },
            error: null
        };
    }

    return { data: data as PaymentSettings, error: null };
}

export async function savePaymentSettings(settings: {
    debit_surcharge: number;
    credit_1_surcharge: number;
    credit_3_surcharge: number;
}): Promise<{ success: boolean; error: string | null }> {
    const session = await getCurrentSession();
    if (!session) return { success: false, error: 'No autenticado' };
    if (session.profile.role !== 'owner') return { success: false, error: 'Solo el dueño puede modificar esto' };

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: 'Sin negocio asociado' };

    const { error } = await supabase
        .from('payment_settings')
        .upsert({
            tenant_id: profile.tenant_id,
            debit_surcharge: settings.debit_surcharge,
            credit_1_surcharge: settings.credit_1_surcharge,
            credit_3_surcharge: settings.credit_3_surcharge,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

    if (error) return { success: false, error: error.message };

    revalidatePath('/config');
    revalidatePath('/ventas');
    return { success: true, error: null };
}
