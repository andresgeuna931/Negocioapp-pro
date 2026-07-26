'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { cancelSale } from '@/lib/actions/sales';
import { Eye, Ban, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SaleItem {
    id: string;
    product_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
    product?: { unit_type: string };
}

interface Sale {
    id: string;
    total_amount: number;
    payment_method: string;
    notes?: string;
    created_at: string;
    is_cancelled?: boolean;
    cancellation_reason?: string;
    seller?: { full_name: string };
    items?: SaleItem[];
    customer_name?: string;
}

interface SalesSessionTableProps {
    sales: Sale[];
    userRole: string;
}

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
    cash:     { label: 'Efectivo',      color: 'success' },
    transfer: { label: 'Transferencia', color: 'info' },
    qr:       { label: 'QR',            color: 'info' },
    debit:    { label: 'Débito',        color: 'default' },
    credit:   { label: 'Crédito',       color: 'default' },
    mixed:    { label: 'Fiado',         color: 'warning' },
    account:  { label: 'Fiado',         color: 'warning' },
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatUnitType(qty: number, unitType?: string) {
    if (unitType === 'kg') return `${qty} kg`;
    if (unitType === 'lt') return `${qty} L`;
    return `${qty} u.`;
}

export function SalesSessionTable({ sales, userRole }: SalesSessionTableProps) {
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState<Sale | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canCancel = userRole === 'owner' || userRole === 'admin';

    const totalSesion = sales
        .filter(s => !s.is_cancelled)
        .reduce((sum, s) => sum + Number(s.total_amount), 0);

    const anuladas = sales.filter(s => s.is_cancelled).length;

    async function handleCancel() {
        if (!cancelConfirm) return;
        setLoading(true);
        setError('');
        const res = await cancelSale(cancelConfirm.id, cancelReason || 'Anulada por operador');
        if (res.success) {
            setCancelConfirm(null);
            setCancelReason('');
            window.location.reload();
        } else {
            setError(res.error || 'Error al anular');
        }
        setLoading(false);
    }

    if (sales.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <p className="text-sm">No hay ventas en esta sesión todavía.</p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">#</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Hora</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Productos</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Medio</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-slate-500">Total</th>
                            <th className="py-2 px-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale, idx) => {
                            const method = METHOD_LABELS[sale.payment_method] || { label: sale.payment_method, color: 'default' };
                            const cancelled = sale.is_cancelled;
                            const itemsSummary = sale.items
                                ? sale.items.slice(0, 2).map(i => `${i.product_name} ×${i.qty}`).join(', ') +
                                  (sale.items.length > 2 ? ` +${sale.items.length - 2} más` : '')
                                : '—';

                            return (
                                <tr
                                    key={sale.id}
                                    className={`border-b border-slate-100 dark:border-slate-800 ${cancelled ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <td className="py-3 px-3 text-xs text-slate-400">{sales.length - idx}</td>
                                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {formatTime(sale.created_at)}
                                    </td>
                                    <td className="py-3 px-3">
                                        <p className={`text-sm text-slate-900 dark:text-white ${cancelled ? 'line-through' : ''}`}>
                                            {itemsSummary}
                                        </p>
                                        {sale.seller && (
                                            <p className="text-xs text-slate-400 mt-0.5">{sale.seller.full_name}</p>
                                        )}
                                        {cancelled && (
                                            <p className="text-xs text-red-400 mt-0.5">Anulada</p>
                                        )}
                                    </td>
                                    <td className="py-3 px-3">
                                        {cancelled ? (
                                            <Badge variant="danger" size="sm">Anulada</Badge>
                                        ) : (
                                            <Badge variant={method.color as any} size="sm">{method.label}</Badge>
                                        )}
                                    </td>
                                    <td className={`py-3 px-3 text-right text-sm font-medium ${cancelled ? 'text-red-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                        {cancelled ? `−${formatCurrency(Number(sale.total_amount))}` : formatCurrency(Number(sale.total_amount))}
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button
                                                onClick={() => setSelectedSale(sale)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded"
                                                aria-label="Ver detalle"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {canCancel && !cancelled && (
                                                <button
                                                    onClick={() => setCancelConfirm(sale)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded"
                                                    aria-label="Anular venta"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Totales */}
            <div className="mt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{sales.length} ventas</span>
                    {anuladas > 0 && (
                        <span className="text-xs text-red-400">{anuladas} anulada{anuladas > 1 ? 's' : ''}</span>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Total sesión</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalSesion)}</p>
                </div>
            </div>

            {/* Modal detalle */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSale(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                    Detalle de venta
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {formatTime(selectedSale.created_at)} · {selectedSale.seller?.full_name}
                                    {selectedSale.notes && ` · ${selectedSale.notes}`}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSale(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-0 mb-4">
                            {selectedSale.items?.map(item => (
                                <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-sm text-slate-900 dark:text-white">{item.product_name}</p>
                                        <p className="text-xs text-slate-400">
                                            {formatUnitType(item.qty, item.product?.unit_type)} × {formatCurrency(item.unit_price)}
                                        </p>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(item.line_total)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center py-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">Total</span>
                            <span className="text-lg font-bold text-emerald-600">{formatCurrency(Number(selectedSale.total_amount))}</span>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cerrar
                            </button>
                            {canCancel && !selectedSale.is_cancelled && (
                                <button
                                    onClick={() => { setSelectedSale(null); setCancelConfirm(selectedSale); }}
                                    className="py-2 px-4 bg-red-50 border border-red-200 dark:border-red-800 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-100 flex items-center gap-1"
                                >
                                    <Ban className="w-4 h-4" /> Anular
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación anulación */}
            {cancelConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Anular venta</h3>
                                <p className="text-xs text-slate-400">Esta acción restaura el stock y revierte la deuda si era fiado.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-4">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                {cancelConfirm.items?.slice(0, 2).map(i => `${i.product_name} ×${i.qty}`).join(', ')}
                            </p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                                {formatCurrency(Number(cancelConfirm.total_amount))}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs text-slate-500 mb-1 block">Motivo (opcional)</label>
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="Ej: Error en el precio, producto devuelto..."
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-red-400"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 mb-3">{error}</p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setCancelConfirm(null); setCancelReason(''); setError(''); }}
                                disabled={loading}
                                className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl text-sm text-white font-medium"
                            >
                                {loading ? 'Anulando...' : 'Confirmar anulación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
