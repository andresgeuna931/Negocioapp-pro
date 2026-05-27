'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CashSession, CashMovement, CashMovementType } from '@/lib/types';

// Helper to get current user's tenant_id
async function getCurrentUserContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return null;
    return { supabase, user, tenantId: profile.tenant_id };
}

// Get current open cash session
export async function getCurrentCashSession() {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('cash_sessions')
        .select(`
            *,
            opener:profiles!cash_sessions_opened_by_fkey(full_name)
        `)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'open')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching cash session:', error);
        return { data: null, error: error.message };
    }

    return { data: data as CashSession | null, error: null };
}

// Open new cash session
export async function openCashSession(openingAmount: number) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    // Check if there's already an open session FOR THIS TENANT
    const { data: existingSession } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'open')
        .single();

    if (existingSession) {
        return { data: null, error: 'Ya hay una caja abierta. Cerrala antes de abrir una nueva.' };
    }

    // Create new session
    const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
            tenant_id: tenantId,  // CRITICAL: Always set tenant_id
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

    if (error) {
        console.error('Error opening cash session:', error);
        return { data: null, error: error.message };
    }

    revalidatePath('/caja');
    return { data: data as CashSession, error: null };
}

// Close cash session
export async function closeCashSession(actualCash: number, notes?: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    // Get current open session FOR THIS TENANT
    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'open')
        .single();

    if (sessionError || !session) {
        return { data: null, error: 'No hay caja abierta para cerrar' };
    }

    // Calculate expected cash
    const expectedCash = session.opening_amount
        + session.total_sales_cash
        + session.total_deposits
        - session.total_withdrawals;

    const difference = actualCash - expectedCash;

    // Update session
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
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant on update
        .select()
        .single();

    if (error) {
        console.error('Error closing cash session:', error);
        return { data: null, error: error.message };
    }

    revalidatePath('/caja');
    return { data: data as CashSession, error: null };
}

// Add cash movement (withdrawal or deposit)
export async function addCashMovement(
    type: 'withdrawal' | 'deposit' | 'expense',
    amount: number,
    description?: string
) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, user, tenantId } = ctx;

    // Get current open session FOR THIS TENANT
    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('id, total_withdrawals, total_deposits')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'open')
        .single();

    if (sessionError || !session) {
        return { data: null, error: 'No hay caja abierta' };
    }

    // Create movement record
    const { data: movement, error: movementError } = await supabase
        .from('cash_movements')
        .insert({
            session_id: session.id,
            type: type,
            amount: amount,
            description: description,
            created_by: user.id,
        })
        .select()
        .single();

    if (movementError) {
        console.error('Error creating cash movement:', movementError);
        return { data: null, error: movementError.message };
    }

    // Update session totals
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
        .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant on update

    revalidatePath('/caja');
    return { data: movement as CashMovement, error: null };
}

// Get cash movements for current session
export async function getCashMovements(sessionId?: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    // If no sessionId provided, get the current open session for this tenant
    let targetSessionId = sessionId;
    if (!targetSessionId) {
        const { data: openSession } = await supabase
            .from('cash_sessions')
            .select('id')
            .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
            .eq('status', 'open')
            .single();
        targetSessionId = openSession?.id;
    }

    if (!targetSessionId) {
        return { data: [], error: null };
    }

    // Verify the session belongs to this tenant before fetching movements
    const { data: sessionCheck } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('id', targetSessionId)
        .eq('tenant_id', tenantId)  // CRITICAL: Verify session belongs to tenant
        .single();

    if (!sessionCheck) {
        return { data: null, error: 'Sesión no encontrada' };
    }

    const { data, error } = await supabase
        .from('cash_movements')
        .select(`
            *,
            creator:profiles!cash_movements_created_by_fkey(full_name)
        `)
        .eq('session_id', targetSessionId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching cash movements:', error);
        return { data: null, error: error.message };
    }

    return { data: data as CashMovement[], error: null };
}

// Get cash session history
export async function getCashSessionHistory(limit: number = 10) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { data: null, error: 'No autenticado' };
    const { supabase, tenantId } = ctx;

    const { data, error } = await supabase
        .from('cash_sessions')
        .select(`
            *,
            opener:profiles!cash_sessions_opened_by_fkey(full_name),
            closer:profiles!cash_sessions_closed_by_fkey(full_name)
        `)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching cash session history:', error);
        return { data: null, error: error.message };
    }

    return { data: data as CashSession[], error: null };
}

// Get today's sales summary for cash (called when making sales)
export async function updateCashSessionFromSale(totalAmount: number, paymentMethod: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { error: null }; // No session = skip silently

    const { supabase, tenantId } = ctx;

    // Get current open session FOR THIS TENANT
    const { data: session } = await supabase
        .from('cash_sessions')
        .select('id, total_sales_cash, total_sales_other')
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .eq('status', 'open')
        .single();

    if (!session) {
        // No open session, skip update
        return { error: null };
    }

    // Update based on payment method
    const isCash = paymentMethod === 'cash';
    const updateData = isCash
        ? { total_sales_cash: session.total_sales_cash + totalAmount }
        : { total_sales_other: session.total_sales_other + totalAmount };

    await supabase
        .from('cash_sessions')
        .update(updateData)
        .eq('id', session.id)
        .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant on update

    return { error: null };
}
