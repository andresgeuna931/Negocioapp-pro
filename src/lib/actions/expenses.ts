'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const EXPENSE_CATEGORIES = [
    'Mercadería',
    'Alquiler',
    'Electricidad',
    'Agua',
    'Gas',
    'Internet/Teléfono',
    'Sueldos',
    'Limpieza',
    'Mantenimiento',
    'Impuestos',
    'Otros',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
    id: string;
    tenant_id: string;
    amount: number;
    category: string;
    description: string | null;
    date: string;
    created_at: string;
}

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

export async function getExpenses(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { data: null, error: 'No autenticado' };

    const now = new Date();
    let from: Date;

    switch (period) {
        case 'today':
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            from = new Date(now);
            from.setDate(now.getDate() - 7);
            break;
        case 'year':
            from = new Date(now.getFullYear(), 0, 1);
            break;
        case 'month':
        default:
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }

    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', from.toISOString().split('T')[0])
        .order('date', { ascending: false });

    if (error) return { data: null, error: error.message };

    return { data: data as Expense[], error: null };
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
