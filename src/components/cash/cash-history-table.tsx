'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getSalesBySessionRange } from '@/lib/actions/reports';
import type { CashSession } from '@/lib/types';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface CashHistoryTableProps {
    sessions: CashSession[];
}

const TZ = 'America/Argentina/Buenos_Aires';

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', year: '2-digit', timeZone: TZ });
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
}

function isSameDay(a: string, b: string) {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate();
}

const METHOD_COLORS: Record<string, string> = {
    cash: '#1d9e75', transfer: '#378add', qr: '#7f77dd',
    debit: '#d4537e', credit: '#d85a30', mixed: '#ba7517', account: '#ba7517',
};

export function CashHistoryTable({ sessions }: CashHistoryTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<Record<string, any>>({});

    if (!sessions || sessions.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                No hay cierres anteriores
            </div>
        );
    }

    async function handleExpand(session: CashSession) {
        if (expandedId === session.id) {
            setExpandedId(null);
            return;
        }
        if (sessionData[session.id]) {
            setExpandedId(session.id);
            return;
        }
        setLoadingId(session.id);
        const res = await getSalesBySessionRange(session.opened_at!, session.closed_at!);
        if (res.data) {
            setSessionData(prev => ({ ...prev, [session.id]: res.data }));
        }
        setLoadingId(null);
        setExpandedId(session.id);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Abrió</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Cerró</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Apertura</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">Total vendido</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Esperado</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Real</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Diferencia</th>
                        <th className="py-3 px-4"></th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session) => {
                        const diff = session.difference || 0;
                        const crossesMidnight = session.opened_at && session.closed_at &&
                            !isSameDay(session.opened_at, session.closed_at);
                        const isExpanded = expandedId === session.id;
                        const isLoading = loadingId === session.id;
                        const data = sessionData[session.id];
                        const totalVendido = session.total_sales_cash + session.total_sales_other;

                        return (
                            <>
                                <tr
                                    key={session.id}
                                    onClick={() => handleExpand(session)}
                                    className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                                        isExpanded
                                            ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <td className="py-3 px-4">
                                        {crossesMidnight ? (
                                            <>
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {formatDateShort(session.opened_at!)} → {formatDateShort(session.closed_at!)}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {formatTime(session.opened_at!)} → {formatTime(session.closed_at!)}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {session.closed_at && new Date(session.closed_at).toLocaleDateString('es-AR', { timeZone: TZ })}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {session.opened_at && formatTime(session.opened_at)}
                                                    {' → '}
                                                    {session.closed_at && formatTime(session.closed_at)}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            {(session.opener as any)?.full_name || '—'}
                                        </p>
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            {(session.closer as any)?.full_name || '—'}
                                        </p>
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                        {formatCurrency(session.opening_amount)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totalVendido)}
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
                                    <td className="py-3 px-4 text-right">
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                                        ) : isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                                        )}
                                    </td>
                                </tr>

                                {isExpanded && data && (
                                    <tr key={`${session.id}-detail`} className="border-b border-slate-100 dark:border-slate-800">
                                        <td colSpan={9} className="px-4 py-4 bg-slate-50 dark:bg-slate-800/30">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Desglose por método de pago</p>
                                                    <div className="space-y-0">
                                                        {data.byMethod.map((m: any) => (
                                                            <div key={m.key} className="flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: METHOD_COLORS[m.key] || '#888' }} />
                                                                <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">{m.label}</span>
                                                                {m.cancelled > 0 && (
                                                                    <span className="text-xs text-red-400">{m.cancelled} anulada{m.cancelled > 1 ? 's' : ''}</span>
                                                                )}
                                                                <span className="text-xs text-slate-400">{m.count} venta{m.count !== 1 ? 's' : ''}</span>
                                                                <span className="text-sm font-medium text-slate-900 dark:text-white w-24 text-right">{formatCurrency(m.total)}</span>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-between items-center pt-3">
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total vendido</span>
                                                            <span className="text-base font-bold text-emerald-600">{formatCurrency(data.totalVendido)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Ventas de la sesión</p>
                                                    <div className="space-y-0 max-h-48 overflow-y-auto">
                                                        {data.sales.length === 0 ? (
                                                            <p className="text-sm text-slate-400">Sin ventas en esta sesión</p>
                                                        ) : data.sales.map((sale: any) => (
                                                            <div key={sale.id} className={`flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 ${sale.is_cancelled ? 'opacity-50' : ''}`}>
                                                                <span className="text-xs text-slate-400 w-12 flex-shrink-0">{formatTime(sale.created_at)}</span>
                                                                <span className={`text-xs text-slate-700 dark:text-slate-300 flex-1 truncate ${sale.is_cancelled ? 'line-through' : ''}`}>
                                                                    {sale.items?.slice(0, 2).map((i: any) => `${i.product_name} ×${i.qty}`).join(', ')}
                                                                    {sale.items?.length > 2 ? ` +${sale.items.length - 2}` : ''}
                                                                </span>
                                                                {sale.is_cancelled ? (
                                                                    <Badge variant="danger" size="sm">Anulada</Badge>
                                                                ) : (
                                                                    <span className="text-xs font-medium text-slate-900 dark:text-white w-20 text-right">{formatCurrency(Number(sale.total_amount))}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
