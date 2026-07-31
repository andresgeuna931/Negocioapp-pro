'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Customer } from '@/lib/types';
import { getCustomerMovements } from '@/lib/actions/customers';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AccountHistoryDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AccountHistoryDialog({ customer, open, onOpenChange }: AccountHistoryDialogProps) {
    const [movements, setMovements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (open && customer) {
            loadMovements();
        }
        if (!open) {
            // Resetear al cerrar para evitar datos stale en la próxima apertura
            setMovements([]);
            setExpandedId(null);
        }
    }, [open, customer]);

    async function loadMovements() {
        if (!customer) return;
        setIsLoading(true);
        setMovements([]); // Resetear antes de cargar para evitar datos stale
        const res = await getCustomerMovements(customer.id);
        // Setear siempre, incluso si data es vacío
        setMovements(res.data ?? []);
        setIsLoading(false);
    }

    const getMovementBadge = (type: string) => {
        switch (type) {
            case 'sale':
                return <Badge variant="danger">Venta</Badge>;
            case 'payment':
                return <Badge variant="success">Pago</Badge>;
            case 'adjustment_debit':
                return <Badge variant="warning">Ajuste (+)</Badge>;
            case 'adjustment_credit':
                return <Badge variant="success">Ajuste (-)</Badge>;
            default:
                return <Badge variant="default">{type}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Historial de Cuenta: {customer?.full_name}</DialogTitle>
                    <DialogDescription>
                        Movimientos recientes. Tocá una venta para ver el detalle de productos.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px]">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            No hay movimientos registrados.
                        </div>
                    ) : (
                        <div className="h-[500px] overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-6"></TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.map((move) => {
                                        const isDebit = ['sale', 'adjustment_debit'].includes(move.type);
                                        const hasSaleItems = move.type === 'sale' && move.sale_items?.length > 0;
                                        const isExpanded = expandedId === move.id;

                                        return (
                                            <>
                                                <TableRow
                                                    key={move.id}
                                                    className={`${hasSaleItems ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                                    onClick={() => hasSaleItems && setExpandedId(isExpanded ? null : move.id)}
                                                >
                                                    <TableCell className="px-2">
                                                        {hasSaleItems && (
                                                            isExpanded
                                                                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                                : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {formatDate(move.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getMovementBadge(move.type)}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate" title={move.description}>
                                                        {hasSaleItems
                                                            ? move.sale_items.slice(0, 2).map((i: any) => `${i.product_name} ×${i.qty}`).join(', ') + (move.sale_items.length > 2 ? ` +${move.sale_items.length - 2}` : '')
                                                            : move.description || '-'
                                                        }
                                                    </TableCell>
                                                    <TableCell className={`text-right font-medium ${isDebit ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {isDebit ? `+${formatCurrency(move.amount)}` : formatCurrency(move.amount)}
                                                    </TableCell>
                                                </TableRow>

                                                {isExpanded && hasSaleItems && (
                                                    <TableRow key={`${move.id}-detail`}>
                                                        <TableCell colSpan={5} className="bg-slate-50 dark:bg-slate-800/30 px-6 py-3">
                                                            <div className="space-y-1">
                                                                {move.sale_items.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                                        <span className="text-slate-600 dark:text-slate-400">
                                                                            {item.product_name} × {item.qty}
                                                                        </span>
                                                                        <span className="text-slate-500 text-xs">
                                                                            {formatCurrency(item.unit_price)} c/u
                                                                        </span>
                                                                        <span className="font-medium text-slate-900 dark:text-white w-20 text-right">
                                                                            {formatCurrency(item.line_total)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                                                    <span className="text-xs font-medium text-slate-500">Total</span>
                                                                    <span className="font-medium text-red-500">{formatCurrency(move.amount)}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
