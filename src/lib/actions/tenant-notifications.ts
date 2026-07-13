'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export type TenantNotificationType = 'stock_low' | 'payment_received' | 'subscription_expiring';

export interface TenantNotification {
    id: string;
    tenant_id: string;
    type: TenantNotificationType;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

// Leer notificaciones del tenant autenticado (máx 20 más recientes)
export async function getTenantNotifications() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tenant_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching tenant notifications:', error);
        return { data: [], unreadCount: 0 };
    }

    const unreadCount = data.filter(n => !n.read).length;
    return { data: data as TenantNotification[], unreadCount };
}

// Marcar una notificación como leída
export async function markTenantNotificationRead(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('tenant_notifications')
        .update({ read: true })
        .eq('id', id);

    if (error) console.error('Error marking tenant notification read:', error);
    return { success: !error };
}

// Marcar todas como leídas
export async function markAllTenantNotificationsRead(tenantId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('tenant_notifications')
        .update({ read: true })
        .eq('tenant_id', tenantId)
        .eq('read', false);

    if (error) console.error('Error marking all tenant notifications read:', error);
    return { success: !error };
}

// Crear notificación para un tenant — usa admin client para bypassear RLS
export async function createTenantNotification(
    tenantId: string,
    type: TenantNotificationType,
    title: string,
    message: string
) {
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminSupabase
        .from('tenant_notifications')
        .insert({ tenant_id: tenantId, type, title, message });

    if (error) console.error('Error creating tenant notification:', error);
    return { success: !error };
}

// Verificar si ya existe una notificación reciente del mismo tipo para el mismo tenant
// Evita spam de notificaciones duplicadas (ventana de 2 horas)
export async function tenantNotificationExists(
    tenantId: string,
    type: TenantNotificationType,
    messageContains?: string
): Promise<boolean> {
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const yesterday = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 horas — tiempo mínimo entre notificaciones del mismo producto

    let query = adminSupabase
        .from('tenant_notifications')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('type', type)
        .gte('created_at', yesterday);

    if (messageContains) {
        query = query.ilike('message', `%${messageContains}%`);
    }

    const { data } = await query.limit(1);
    return (data?.length ?? 0) > 0;
}
