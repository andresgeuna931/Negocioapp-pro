'use client';

import { formatQuantity } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AdjustmentHistoryTableProps {
    adjustments: Array<{
        id: string;
        qty_change: number;
        stock_before: number;
        stock_after: number;
        notes: string | null;
        created_at: string;
        product?: { name: string; unit_type: string } | null;
        creator?: { full_name: string } | null;
    }>;
}

export function AdjustmentHistoryTable({ adjustments }: AdjustmentHistoryTableProps) {
    if (!adjustments || adjustments.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                No hay ajustes recientes
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Producto</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Antes</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Después</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Ajuste</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Motivo</th>
                    </tr>
                </thead>
                <tbody>
                    {adjustments.map((adj) => {
                        const change = Number(adj.qty_change);
                        const unitType = adj.product?.unit_type || 'unit';

                        return (
                            <tr
                                key={adj.id}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                <td className="py-3 px-4">
                                    <div className="text-sm text-slate-900 dark:text-white">
                                        {new Date(adj.created_at).toLocaleDateString('es-AR')}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {new Date(adj.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                    {adj.product?.name || 'Producto eliminado'}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                                    {formatQuantity(adj.stock_before, unitType)}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                                    {formatQuantity(adj.stock_after, unitType)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <Badge
                                        variant={change > 0 ? 'success' : 'danger'}
                                        size="sm"
                                    >
                                        {change > 0 ? '+' : ''}{formatQuantity(change, unitType)}
                                    </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">
                                    {adj.notes || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
