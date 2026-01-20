'use client';

import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CashSession } from '@/lib/types';

interface CashHistoryTableProps {
    sessions: CashSession[];
}

export function CashHistoryTable({ sessions }: CashHistoryTableProps) {
    if (!sessions || sessions.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                No hay cierres anteriores
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Fecha</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Apertura</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Esperado</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Real</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session) => {
                        const diff = session.difference || 0;
                        return (
                            <tr
                                key={session.id}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        {session.closed_at && new Date(session.closed_at).toLocaleDateString('es-AR')}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {session.closed_at && new Date(session.closed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                    {formatCurrency(session.opening_amount)}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                    {formatCurrency(session.expected_cash)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                                    {formatCurrency(session.actual_cash || 0)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <Badge
                                        variant={diff === 0 ? 'success' : diff > 0 ? 'info' : 'danger'}
                                        size="sm"
                                    >
                                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                    </Badge>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
