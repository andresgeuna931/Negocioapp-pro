'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function getCurrentTenantId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
    return profile?.tenant_id || null;
}

function getPeriodFrom(period: 'today' | 'week' | 'month' | 'year'): string {
    const now = new Date();
    switch (period) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
        case 'week':
            const week = new Date(now);
            week.setDate(now.getDate() - 7);
            return week.toISOString().split('T')[0];
        case 'year':
            return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        case 'month':
        default:
            return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
}

export async function getExpenses(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const from = getPeriodFrom(period);

    // Gastos cargados manualmente por el dueño
    const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', from)
        .order('date', { ascending: false });

    if (expensesError) return { data: null, error: expensesError.message };

    // Egresos de caja registrados por empleados
    const { data: cashMovements } = await supabase
        .from('cash_movements')
        .select('id, amount, description, created_at, type')
        .eq('tenant_id', tenantId)
        .in('type', ['expense', 'withdrawal'])
        .gte('created_at', from + 'T00:00:00.000Z')
        .order('created_at', { ascending: false });

    // Convertir cash_movements al formato de expenses
    const cashExpenses = (cashMovements || []).map(mov => ({
        id: `cash_${mov.id}`,
        tenant_id: tenantId,
        amount: Number(mov.amount),
        category: 'Egreso de Caja',
        description: mov.description || null,
        date: mov.created_at.split('T')[0],
        created_at: mov.created_at,
        from_cash: true,
    }));

    // Combinar y ordenar por fecha
    const allExpenses = [...(expenses || []).map(e => ({ ...e, from_cash: false })), ...cashExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { data: allExpenses, error: null };
}

export async function getExpensesSummary(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    const { data, error } = await getExpenses(period);
    if (error || !data) return { total: 0, byCategory: {} };

    const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    data.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });

    return { total, byCategory };
}

export async function createExpense(formData: {
    amount: number;
    category: string;
    description?: string;
    date: string;
}) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('expenses')
        .insert({
            tenant_id: tenantId,
            amount: formData.amount,
            category: formData.category,
            description: formData.description || null,
            date: formData.date,
        });

    if (error) return { error: error.message };

    revalidatePath('/gastos');
    revalidatePath('/reportes');
    return { error: null };
}

export async function deleteExpense(id: string) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { error: 'No autenticado' };

    // No permitir eliminar egresos de caja
    if (id.startsWith('cash_')) return { error: 'No podés eliminar egresos de caja desde este módulo' };

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) return { error: error.message };

    revalidatePath('/gastos');
    revalidatePath('/reportes');
    return { error: null };
}
