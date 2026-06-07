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

    const now = new Date();
    let periodStart = now;
    let periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    let dbSubPlan = 'premium';
    let dbTenantPlan = 'professional';
    
    if (planId === 'starter' || planId === 'test') {
        dbSubPlan = 'basic';
        dbTenantPlan = 'starter';
    } else if (planId === 'business') {
        dbSubPlan = 'premium';
        dbTenantPlan = 'business';
    }

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

/**
 * Suspende un tenant y cancela su suscripción en MercadoPago si existe.
 */
export async function suspendTenant(tenantId: string) {
    await requireAdmin();

    const supabaseServiceRole = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar external_subscription_id en Supabase
    const { data: subscription } = await supabaseServiceRole
        .from('subscriptions')
        .select('external_subscription_id')
        .eq('tenant_id', tenantId)
        .single();

    // 2. Cancelar en MP si tiene ID
    if (subscription?.external_subscription_id) {
        try {
            const mpResponse = await fetch(
                `https://api.mercadopago.com/preapproval/${subscription.external_subscription_id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'cancelled' }),
                }
            );
            if (!mpResponse.ok) {
                const err = await mpResponse.json();
                console.error('Error cancelando suscripción en MP:', err);
            } else {
                console.log(`✅ Suscripción MP cancelada: ${subscription.external_subscription_id}`);
            }
        } catch (error) {
            // Si MP falla, seguimos suspendiendo en Supabase igual
            console.error('Error llamando a MP API:', error);
        }
    } else {
        console.log(`⚠️ Tenant ${tenantId} no tiene external_subscription_id — solo suspendiendo en Supabase`);
    }

    // 3. Suspender en Supabase siempre
    const { error: tenantError } = await supabaseServiceRole
        .from('tenants')
        .update({ status: 'suspended' })
        .eq('id', tenantId);

    if (tenantError) throw new Error(`Error suspendiendo tenant: ${tenantError.message}`);

    // 4. Actualizar suscripción a cancelled
    await supabaseServiceRole
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId);

    revalidatePath('/admin/tenants');
    return { success: true };
}
