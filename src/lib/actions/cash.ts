'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { hasPermission } from '@/lib/permissions';
import type { CashSession, CashMovement } from '@/lib/types';

async function getCurrentUserContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();
    if (!profile?.tenant_id) return null;
    return { supabase, user, tenantId: profile.tenant_id, role: profile.role };
}

export async function getCurrentCashSession() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('cash_sessions')
        .select(`*, opener:profiles!cash_sessions_opened_by_fkey(full_name)`)
        .eq('status', 'open')
        .eq('tenant_id', tenantId)
        .single();

    if (error && error.code !== 'PGRST116') {
        return { data: null, error: error.message };
    }

    return { data: data as CashSession | null, error: null };
}

export async function openCashSession(openingAmount: number) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    const { data: existingSession } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('status', 'open')
        .eq('tenant_id', tenantId)
        .single();

    if (existingSession) {
        return { data: null, error: 'Ya hay una caja abierta. Cerrala antes de abrir una nueva.' };
    }

    const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
            tenant_id: tenantId,
            opened_by: user.id,
            opened_at: new Date().toISOString(),
            opening_amount: openingAmount,
            expected_cash: openingAmount,
            total_sales_cash: 0,
            total_sales_other: 0,
            total_withdrawals: 0,
            total_deposits: 0,
            status: 'open',
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/caja');
    return { data: data as CashSession, error: null };
}

export async function closeCashSession(actualCash: number, notes?: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'open')
        .eq('tenant_id', tenantId)
        .single();

    if (sessionError || !session) {
        return { data: null, error: 'No hay caja abierta para cerrar' };
    }

    const expectedCash = session.opening_amount
        + session.total_sales_cash
        + session.total_deposits
        - session.total_withdrawals;

    const difference = actualCash - expectedCash;

    const { data, error } = await supabase
        .from('cash_sessions')
        .update({
            closed_by: user.id,
            closed_at: new Date().toISOString(),
            expected_cash: expectedCash,
            actual_cash: actualCash,
            difference: difference,
            status: 'closed',
            notes: notes,
        })
        .eq('id', session.id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/caja');
    return { data: data as CashSession, error: null };
}

export async function addCashMovement(
    type: 'withdrawal' | 'deposit' | 'expense',
    amount: number,
    description?: string
) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    // Retiros y gastos requieren descripción obligatoria (aplica a todos los roles)
    if ((type === 'withdrawal' || type === 'expense') && !description?.trim()) {
        return { data: null, error: 'La descripción es obligatoria para retiros y gastos' };
    }

    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('id, total_withdrawals, total_deposits')
        .eq('status', 'open')
        .eq('tenant_id', tenantId)
        .single();

    if (sessionError || !session) {
        return { data: null, error: 'No hay caja abierta' };
    }

    const { data: movement, error: movementError } = await supabase
        .from('cash_movements')
        .insert({
            tenant_id: tenantId,
            session_id: session.id,
            type: type,
            amount: amount,
            description: description,
            created_by: user.id,
        })
        .select()
        .single();

    if (movementError) return { data: null, error: movementError.message };

    const updateData: Record<string, number> = {};
    if (type === 'withdrawal' || type === 'expense') {
        updateData.total_withdrawals = session.total_withdrawals + amount;
    } else if (type === 'deposit') {
        updateData.total_deposits = session.total_deposits + amount;
    }

    await supabase
        .from('cash_sessions')
        .update(updateData)
        .eq('id', session.id)
        .eq('tenant_id', tenantId);

    revalidatePath('/caja');
    return { data: movement as CashMovement, error: null };
}

export async function getCashMovements(sessionId?: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    let query = supabase
        .from('cash_movements')
        .select(`*, creator:profiles!cash_movements_created_by_fkey(full_name)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (sessionId) query = query.eq('session_id', sessionId);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as CashMovement[], error: null };
}

export async function getCashSessionHistory(limit: number = 10) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId, role } = ctx;

    // SEC-09: solo owner/admin puede ver el historial de cajas anteriores
    if (!hasPermission(role, 'reports:view_all')) {
        return { data: null, error: 'No tenés permiso para ver el historial de cajas' };
    }

    const { data, error } = await supabase
        .from('cash_sessions')
        .select(`
            *,
            opener:profiles!cash_sessions_opened_by_fkey(full_name),
            closer:profiles!cash_sessions_closed_by_fkey(full_name)
        `)
        .eq('status', 'closed')
        .eq('tenant_id', tenantId)
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: data as CashSession[], error: null };
}

export async function updateCashSessionFromSale(totalAmount: number, paymentMethod: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { error: null };
    const { supabase, tenantId } = ctx;

    const { data: session } = await supabase
        .from('cash_sessions')
        .select('id, total_sales_cash, total_sales_other')
        .eq('status', 'open')
        .eq('tenant_id', tenantId)
        .single();

    if (!session) return { error: null };

    const isCash = paymentMethod === 'cash';
    const updateData = isCash
        ? { total_sales_cash: session.total_sales_cash + totalAmount }
        : { total_sales_other: session.total_sales_other + totalAmount };

    await supabase
        .from('cash_sessions')
        .update(updateData)
        .eq('id', session.id)
        .eq('tenant_id', tenantId);

    return { error: null };
}
