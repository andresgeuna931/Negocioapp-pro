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
import { Loader2 } from 'lucide-react';
import { Customer } from '@/lib/types';
import { getCustomerMovements } from '@/lib/actions/customers';
import { formatCurrency, formatDate } from '@/lib/utils';
// ScrollArea removed

interface AccountHistoryDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AccountHistoryDialog({ customer, open, onOpenChange }: AccountHistoryDialogProps) {
    const [movements, setMovements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && customer) {
            loadMovements();
        }
    }, [open, customer]);

    async function loadMovements() {
        if (!customer) return;
        setIsLoading(true);
        const res = await getCustomerMovements(customer.id);
        if (res.success && res.data) {
            setMovements(res.data);
        }
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
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Historial de Cuenta: {customer?.full_name}</DialogTitle>
                    <DialogDescription>
                        Movimientos recientes y saldo histórico.
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
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.map((move) => {
                                        const isDebit = ['sale', 'adjustment_debit'].includes(move.type);
                                        return (
                                            <TableRow key={move.id}>
                                                <TableCell className="text-xs text-slate-500">
                                                    {formatDate(move.created_at)}
                                                </TableCell>
                                                <TableCell>
                                                    {getMovementBadge(move.type)}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={move.description}>
                                                    {move.description || '-'}
                                                </TableCell>
                                                <TableCell className={`text-right font-medium ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {isDebit ? '+' : '-'}{formatCurrency(move.amount)}
                                                </TableCell>
                                            </TableRow>
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
