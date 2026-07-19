'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Check } from 'lucide-react';
import { Customer } from '@/lib/types';
import { getCustomers } from '@/lib/actions/customers';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CustomerSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (customer: Customer) => void;
}

export function CustomerSelector({ open, onOpenChange, onSelect }: CustomerSelectorProps) {
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setSearch('');
            loadCustomers();
        }
    }, [open]);

    const loadCustomers = async (query = '') => {
        setLoading(true);
        const res = await getCustomers(query);
        if (res.success && res.data) {
            setCustomers(res.data);
        }
        setLoading(false);
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        const timeoutId = setTimeout(() => loadCustomers(val), 300);
        return () => clearTimeout(timeoutId);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Cliente</DialogTitle>
                    <DialogDescription>
                        Buscá un cliente para cargar la venta a su cuenta corriente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar por nombre o DNI..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                        {loading && <p className="text-sm text-center text-slate-500 py-4">Buscando...</p>}

                        {!loading && customers.length === 0 && (
                            <p className="text-sm text-center text-slate-500 py-4">No se encontraron clientes.</p>
                        )}

                        {customers.map((customer) => {
                            const balance = customer.account?.balance || 0;
                            const limit = customer.credit_limit ?? 0;
                            const available = limit > 0 ? limit - balance : null;
                            const sinCredito = limit === 0;

                            return (
                                <button
                                    key={customer.id}
                                    disabled={sinCredito}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border border-transparent text-left transition-colors
                                        ${sinCredito
                                            ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 cursor-pointer'
                                        }`}
                                    onClick={() => !sinCredito && onSelect(customer)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{customer.full_name}</p>
                                            <p className="text-xs text-slate-500">{customer.dni || 'Sin DNI'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        {balance > 0 && (
                                            <p className="text-xs text-red-600 font-medium">Debe: {formatCurrency(balance)}</p>
                                        )}
                                        {sinCredito ? (
                                            <Badge variant="default" className="text-[10px] h-5 bg-red-100 text-red-600 border border-red-200">
                                                Sin crédito
                                            </Badge>
                                        ) : (
                                            <p className="text-xs text-emerald-600">Disp: {formatCurrency(available || 0)}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
