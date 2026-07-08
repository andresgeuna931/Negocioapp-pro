'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, MoreHorizontal, Pencil, Trash, Search, UserPlus, FileText, Banknote } from 'lucide-react';
import { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { CustomerForm } from './customer-form';
import { PaymentDialog } from './payment-dialog';
import { AccountHistoryDialog } from './account-history-dialog';
import { deleteCustomer } from '@/lib/actions/customers';
import { toast } from 'sonner';

interface CustomersTableProps {
    initialCustomers: Customer[];
}

export function CustomersTable({ initialCustomers }: CustomersTableProps) {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

    // Filter logic (client side for speed on small lists)
    const filteredCustomers = customers.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.dni?.includes(search)
    );

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que querés eliminar este cliente? Se borrará su cuenta corriente.')) return;

        const res = await deleteCustomer(id);
        if (res.success) {
            toast.success("Cliente eliminado");
            window.location.reload();
        } else {
            toast.error("Error", { description: res.error });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nombre o DNI..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                            <UserPlus className="mr-2 h-4 w-4" /> Nuevo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Nuevo Cliente</DialogTitle>
                            <DialogDescription>
                                Completá los datos para dar de alta un nuevo cliente.
                            </DialogDescription>
                        </DialogHeader>
                        <CustomerForm onSuccess={() => {
                            setIsCreateOpen(false);
                            window.location.reload();
                        }} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-900">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>DNI / Tel</TableHead>
                            <TableHead className="text-right">Saldo Actual</TableHead>
                            <TableHead className="text-right">Límite</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    No se encontraron clientes.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map((customer) => {
                                const balance = customer.account?.balance || 0;
                                const isNegative = balance > 0; // Debt

                                return (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{customer.full_name}</span>
                                                <span className="text-xs text-slate-500">{customer.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span>{customer.dni || '-'}</span>
                                                <span className="text-xs text-slate-500">{customer.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                            <span className={isNegative ? "text-red-600" : "text-emerald-600"}>
                                                {formatCurrency(balance)}
                                            </span>
                                            {isNegative && <span className="text-xs text-red-500 block">Debe</span>}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500">
                                            {formatCurrency(customer.credit_limit)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={customer.is_active ? 'success' : 'default'} className={!customer.is_active ? "bg-slate-200 text-slate-500" : ""}>
                                                {customer.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-slate-800 border border-slate-600 shadow-xl">
                                                    <DropdownMenuLabel className="text-slate-300">Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setPaymentCustomer(customer)}>
                                                        <Banknote className="mr-2 h-4 w-4 text-emerald-500" /> Registrar Pago
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setHistoryCustomer(customer)}>
                                                        <FileText className="mr-2 h-4 w-4" /> Ver Historial
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-400"
                                                        onClick={() => handleDelete(customer.id)}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Cliente</DialogTitle>
                    </DialogHeader>
                    {editingCustomer && (
                        <CustomerForm
                            customer={editingCustomer}
                            onSuccess={() => {
                                setEditingCustomer(null);
                                window.location.reload();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <PaymentDialog
                customer={paymentCustomer}
                open={!!paymentCustomer}
                onOpenChange={(open) => !open && setPaymentCustomer(null)}
                onSuccess={() => {
                    setPaymentCustomer(null);
                    window.location.reload();
                }}
            />

            {/* History Dialog */}
            <AccountHistoryDialog
                customer={historyCustomer}
                open={!!historyCustomer}
                onOpenChange={(open) => !open && setHistoryCustomer(null)}
            />
        </div>
    );
}
