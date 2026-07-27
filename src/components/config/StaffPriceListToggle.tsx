'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tag } from 'lucide-react';
import { setAllowStaffPriceLists } from '@/lib/actions/system-settings';

export function StaffPriceListToggle({ initialValue }: { initialValue: boolean }) {
    const [enabled, setEnabled] = useState(initialValue);
    const [loading, setLoading] = useState(false);

    async function handleToggle() {
        setLoading(true);
        const newValue = !enabled;
        const res = await setAllowStaffPriceLists(newValue);
        if (res.success) setEnabled(newValue);
        setLoading(false);
    }

    return (
        <Card>
            <CardContent className="py-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            Listas de precios para empleados
                        </h3>
                        <p className="text-sm text-slate-500">
                            {enabled
                                ? 'Los empleados pueden aplicar listas de precios al vender.'
                                : 'Solo el dueño puede aplicar listas de precios al vender.'}
                        </p>
                    </div>
                    <button
                        onClick={handleToggle}
                        disabled={loading}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                            enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        } ${loading ? 'opacity-50' : ''}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            enabled ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
