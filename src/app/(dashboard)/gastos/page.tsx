'use client';
import { getCurrentSession } from '@/lib/actions/auth';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getExpenses, createExpense, deleteExpense, getExpensesSummary } from '@/lib/actions/expenses';
import { EXPENSE_CATEGORIES } from '@/lib/config/expenses-config';
import type { Expense } from '@/lib/config/expenses-config';
import { Plus, Trash2, TrendingDown, Tag, DollarSign } from 'lucide-react';

type ExpenseWithCash = Expense & { from_cash?: boolean };

export default function GastosPage() {
    const router = useRouter();
    // F-02: verificar rol al montar — redirigir si es staff
    useEffect(() => {
        getCurrentSession().then(session => {
            if (session?.profile?.role === 'staff') {
                router.replace('/');
            }
        });
    }, [router]);

    const [expenses, setExpenses] = useState<ExpenseWithCash[]>([]);
    const [summary, setSummary] = useState<{ total: number; byCategory: Record<string, number> }>({ total: 0, byCategory: {} });
    const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
    const [showForm, setShowForm] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState<{
        amount: string;
        category: string;
        description: string;
        date: string;
    }>({
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        loadData();
    }, [period]);

    async function loadData() {
        const [expensesRes, summaryRes] = await Promise.all([
            getExpenses(period),
            getExpensesSummary(period),
        ]);
        if (expensesRes.data) setExpenses(expensesRes.data as ExpenseWithCash[]);
        setSummary(summaryRes);
    }

    async function handleSubmit() {
        if (!form.amount || Number(form.amount) <= 0) return;
        startTransition(async () => {
            const res = await createExpense({
                amount: Number(form.amount),
                category: form.category,
                description: form.description,
                date: form.date,
            });
            if (!res.error) {
                setForm({
                    amount: '',
                    category: EXPENSE_CATEGORIES[0],
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                });
                setShowForm(false);
                loadData();
            }
        });
    }

    async function handleDelete(id: string) {
        startTransition(async () => {
            await deleteExpense(id);
            loadData();
        });
    }

    const periodLabel = {
        today: 'Hoy',
        week: 'Esta semana',
        month: 'Este mes',
        year: 'Este año',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gastos</h1>
                    <p className="text-slate-400 text-sm mt-1">Registrá los gastos de tu negocio</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo gasto
                </button>
            </div>

            <div className="flex gap-2">
                {(['today', 'week', 'month', 'year'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            period === p
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                        {periodLabel[p]}
                    </button>
                ))}
            </div>

            {showForm && (
                <Card className="border-emerald-500/30 bg-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Registrar gasto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Monto *</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Fecha *</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Categoría *</label>
                            <select
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-emerald-500 outline-none"
                            >
                                {EXPENSE_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Descripción (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: Factura de luz de junio"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={isPending || !form.amount}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                {isPending ? 'Guardando...' : 'Guardar gasto'}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/20">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Total gastos</p>
                                <p className="text-lg font-bold text-red-400">{formatCurrency(summary.total)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/20">
                                <Tag className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Categorías</p>
                                <p className="text-lg font-bold text-white">{Object.keys(summary.byCategory).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {Object.keys(summary.byCategory).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            Por categoría — {periodLabel[period].toLowerCase()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Object.entries(summary.byCategory)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, amount]) => (
                                <div key={cat} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300">{cat}</span>
                                    <span className="text-sm font-semibold text-white">{formatCurrency(amount)}</span>
                                </div>
                            ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-white text-base">
                        Gastos — {periodLabel[period].toLowerCase()}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {expenses.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No hay gastos registrados</p>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-white">{expense.category}</span>
                                            {expense.from_cash && (
                                                <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full">
                                                    De Caja
                                                </span>
                                            )}
                                            {expense.description && (
                                                <span className="text-xs text-slate-500">— {expense.description}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(expense.date + 'T12:00:00').toLocaleDateString('es-AR', {
                                                day: 'numeric',
                                                month: 'long',
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-red-400">{formatCurrency(Number(expense.amount))}</span>
                                        {!expense.from_cash && (
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                disabled={isPending}
                                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
