'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Banknote, Smartphone, ArrowLeftRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { registerPayment } from '@/lib/actions/customers';
import { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const paymentSchema = z.object({
    amount: z.coerce.number()
        .refine(val => !isNaN(val) && val > 0, 'Ingresá un monto válido mayor a cero'),
    notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentMethod = 'cash' | 'transfer' | 'qr';

interface PaymentDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
    { id: 'transfer', label: 'Transferencia', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'qr', label: 'QR', icon: <Smartphone className="w-4 h-4" /> },
];

export function PaymentDialog({ customer, open, onOpenChange, onSuccess }: PaymentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema) as any,
        defaultValues: {
            amount: 0,
            notes: '',
        },
    });

    async function onSubmit(data: PaymentFormValues) {
        if (!customer) return;
        setIsLoading(true);
        try {
            const result = await registerPayment(customer.id, data.amount, data.notes, paymentMethod);

            if (result.success) {
                toast.success("Pago registrado correctamente");
                form.reset();
                setPaymentMethod('cash');
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error("Error", {
                    description: result.error || "Ocurrió un error inesperado",
                });
            }
        } catch (error) {
            toast.error("Error", {
                description: "Ocurrió un error inesperado",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const currentBalance = customer?.account?.balance || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                    <DialogDescription>
                        Ingresá el monto y el medio de pago del cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-6 border border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Deuda Actual</p>
                            <p className="font-semibold text-slate-900 dark:text-white">{customer?.full_name}</p>
                        </div>
                        <div className="text-right">
                            <span className={`text-xl font-bold font-mono ${currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatCurrency(currentBalance)}
                            </span>
                        </div>
                    </div>

                    {/* Selector de medio de pago */}
                    <div className="mb-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medio de pago</p>
                        <div className="grid grid-cols-3 gap-2">
                            {PAYMENT_METHODS.map((method) => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                                        paymentMethod === method.id
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                    )}
                                >
                                    {method.icon}
                                    {method.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monto a registrar ($)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                <Input
                                                    type="number"
                                                    placeholder="Ingresá el monto a registrar"
                                                    className="pl-9 text-lg font-medium"
                                                    step="0.01"
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notas (Opcional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Ej: Pago parcial, referencia transferencia..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar Pago
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
