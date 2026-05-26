'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Save } from 'lucide-react';
import { getPaymentSettings, savePaymentSettings } from '@/lib/actions/payment-settings';

export function PaymentSettingsForm() {
    const [debit, setDebit] = useState(0);
    const [credit1, setCredit1] = useState(0);
    const [credit3, setCredit3] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getPaymentSettings().then(({ data }) => {
            if (data) {
                setDebit(data.debit_surcharge);
                setCredit1(data.credit_1_surcharge);
                setCredit3(data.credit_3_surcharge);
            }
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSaved(false);
        const { success, error } = await savePaymentSettings({
            debit_surcharge: debit,
            credit_1_surcharge: credit1,
            credit_3_surcharge: credit3,
        });
        if (success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } else {
            setError(error || 'Error al guardar');
        }
        setSaving(false);
    };

    if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>;

    return (
        <div className="space-y-4">
            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Débito (%)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={debit}
                            onChange={(e) => setDebit(parseFloat(e.target.value) || 0)}
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                    <p className="text-xs text-slate-400">0% = sin recargo</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Crédito 1 cuota (%)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={credit1}
                            onChange={(e) => setCredit1(parseFloat(e.target.value) || 0)}
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Crédito 3 cuotas (%)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={credit3}
                            onChange={(e) => setCredit3(parseFloat(e.target.value) || 0)}
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar recargos'}
                </button>
                {saved && (
                    <span className="text-sm text-emerald-600 font-medium">
                        ✅ Guardado correctamente
                    </span>
                )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                Estos recargos se aplican automáticamente al elegir el método de pago en cada venta.
            </div>
        </div>
    );
}
