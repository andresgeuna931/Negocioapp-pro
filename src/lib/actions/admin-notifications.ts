'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export type NotificationType = 'new_tenant' | 'subscription_expiring' | 'subscription_expired' | 'payment_received';

export interface AdminNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    tenant_id: string | null;
    read: boolean;
    created_at: string;
}

// Leer notificaciones del admin (máx 20 más recientes)
export async function getAdminNotifications() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching notifications:', error);
        return { data: [], unreadCount: 0 };
    }

    const unreadCount = data.filter(n => !n.read).length;
    return { data: data as AdminNotification[], unreadCount };
}

// Marcar una notificación como leída
export async function markNotificationRead(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', id);

    if (error) console.error('Error marking notification read:', error);
    return { success: !error };
}

// Marcar todas como leídas
export async function markAllNotificationsRead() {
    const supabase = await createClient();

    const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('read', false);

    if (error) console.error('Error marking all notifications read:', error);
    return { success: !error };
}

// Crear notificación — usa admin client para bypassear RLS
export async function createAdminNotification(
    type: NotificationType,
    title: string,
    message: string,
    tenantId?: string
) {
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminSupabase
        .from('admin_notifications')
        .insert({
            type,
            title,
            message,
            tenant_id: tenantId || null,
        });

    if (error) console.error('Error creating notification:', error);
    return { success: !error };
}

// Verificar suscripciones próximas a vencer (llamar periódicamente)
export async function checkExpiringSubscriptions() {
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Suscripciones que vencen en los próximos 3 días
    const { data: expiring } = await adminSupabase
        .from('subscriptions')
        .select('tenant_id, current_period_end, tenants(name)')
        .eq('status', 'active')
        .gte('current_period_end', now.toISOString())
        .lte('current_period_end', in3Days.toISOString());

    for (const sub of (expiring || []) as any[]) {
        const tenantName = sub.tenants?.name || sub.tenant_id;
        const fechaVto = new Date(sub.current_period_end).toLocaleDateString('es-AR');

        // Verificar que no exista ya una notificación de este tipo para este tenant hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: existing } = await adminSupabase
            .from('admin_notifications')
            .select('id')
            .eq('type', 'subscription_expiring')
            .eq('tenant_id', sub.tenant_id)
            .gte('created_at', today.toISOString())
            .limit(1);

        if (!existing || existing.length === 0) {
            await createAdminNotification(
                'subscription_expiring',
                '⚠️ Suscripción por vencer',
                `${tenantName} vence el ${fechaVto}`,
                sub.tenant_id
            );
        }
    }

    // Suscripciones vencidas que siguen como active
    const { data: expired } = await adminSupabase
        .from('subscriptions')
        .select('tenant_id, current_period_end, tenants(name)')
        .eq('status', 'active')
        .lt('current_period_end', now.toISOString());

    for (const sub of (expired || []) as any[]) {
        const tenantName = sub.tenants?.name || sub.tenant_id;
        const fechaVto = new Date(sub.current_period_end).toLocaleDateString('es-AR');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: existing } = await adminSupabase
            .from('admin_notifications')
            .select('id')
            .eq('type', 'subscription_expired')
            .eq('tenant_id', sub.tenant_id)
            .gte('created_at', today.toISOString())
            .limit(1);

        if (!existing || existing.length === 0) {
            await createAdminNotification(
                'subscription_expired',
                '🔴 Suscripción vencida',
                `${tenantName} venció el ${fechaVto}`,
                sub.tenant_id
            );
        }
    }

    return { success: true };
}
