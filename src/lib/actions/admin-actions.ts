'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { requireAdmin } from './auth';
import { revalidatePath } from 'next/cache';

/**
 * Manually activates a plan for a tenant (e.g., after bank transfer).
 */
export async function activateTenantManual(tenantId: string, planId: string) {
    await requireAdmin();
    
    const supabaseServiceRole = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // --- INDUSTRY STANDARD: Paid period starts NOW ---
    const now = new Date();
    let periodStart = now;
    let periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    // Map plan internal ID to DB enums
    let dbSubPlan = 'premium';
    let dbTenantPlan = 'professional';
    
    if (planId === 'starter' || planId === 'test') {
        dbSubPlan = 'basic';
        dbTenantPlan = 'starter';
    } else if (planId === 'business') {
        dbSubPlan = 'premium';
        dbTenantPlan = 'business';
    }

    // 1. Upsert Subscription
    const { error: subError } = await supabaseServiceRole
        .from('subscriptions')
        .upsert({
            tenant_id: tenantId,
            status: 'active',
            plan: dbSubPlan,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            last_payment_at: now.toISOString(),
            payment_provider: 'manual_admin',
            updated_at: now.toISOString()
        }, { onConflict: 'tenant_id' });

    if (subError) throw new Error(`Error updating subscription: ${subError.message}`);

    // 2. Update Tenant — ALWAYS set to 'active' after activation
    const { error: tenantError } = await supabaseServiceRole
        .from('tenants')
        .update({
            status: 'active',
            plan_type: dbTenantPlan,
            settings: {
                plan_id: planId,
                manually_activated: true,
                activated_at: now.toISOString()
            }
        })
        .eq('id', tenantId);

    if (tenantError) throw new Error(`Error updating tenant: ${tenantError.message}`);

    revalidatePath('/admin/tenants');
    return { success: true };
}
