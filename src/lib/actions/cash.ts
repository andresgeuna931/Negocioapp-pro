'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CashSession, CashMovement, CashMovementType } from '@/lib/types';

// Get current open cash session
export async function getCurrentCashSession() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('cash_sessions')
        .select(`
            *,
            opener:profiles!cash_sessions_opened_by_fkey(full_name)
        `)
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
    const supabase = await createClient();

    // Check if there's already an open session
    const { data: existingSession } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('status', 'open')
        .single();

    if (existingSession) {
        return { data: null, error: 'Ya hay una caja abierta. Cerrala antes de abrir una nueva.' };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    // Create new session
    const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
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
    const supabase = await createClient();

    // Get current open session
    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'open')
        .single();

    if (sessionError || !session) {
        return { data: null, error: 'No hay caja abierta para cerrar' };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'No autenticado' };
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
    const supabase = await createClient();

    // Get current open session
    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('id, total_withdrawals, total_deposits')
        .eq('status', 'open')
        .single();

    if (sessionError || !session) {
        return { data: null, error: 'No hay caja abierta' };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'No autenticado' };
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
        .eq('id', session.id);

    revalidatePath('/caja');
    return { data: movement as CashMovement, error: null };
}

// Get cash movements for current session
export async function getCashMovements(sessionId?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('cash_movements')
        .select(`
            *,
            creator:profiles!cash_movements_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

    if (sessionId) {
        query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching cash movements:', error);
        return { data: null, error: error.message };
    }

    return { data: data as CashMovement[], error: null };
}

// Get cash session history
export async function getCashSessionHistory(limit: number = 10) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('cash_sessions')
        .select(`
            *,
            opener:profiles!cash_sessions_opened_by_fkey(full_name),
            closer:profiles!cash_sessions_closed_by_fkey(full_name)
        `)
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
    const supabase = await createClient();

    // Get current open session
    const { data: session } = await supabase
        .from('cash_sessions')
        .select('id, total_sales_cash, total_sales_other')
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
        .eq('id', session.id);

    return { error: null };
}
