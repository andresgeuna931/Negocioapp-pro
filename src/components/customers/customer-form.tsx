'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { createCustomer, updateCustomer, CreateCustomerData } from '@/lib/actions/customers';
import { Customer } from '@/lib/types';

const customerSchema = z.object({
    full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    dni: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    credit_limit: z.union([z.string(), z.number()]).transform(val => Number(val) || 0),
    notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
    customer?: Customer;
    onSuccess: () => void;
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            full_name: customer?.full_name || '',
            dni: customer?.dni || '',
            email: customer?.email || '',
            phone: customer?.phone || '',
            address: customer?.address || '',
            credit_limit: customer?.credit_limit || 0,
            notes: customer?.notes || '',
        },
    });

    async function onSubmit(data: CustomerFormValues) {
        setIsLoading(true);
        try {
            const payload: CreateCustomerData = {
                ...data,
                email: data.email || undefined,
            };

            let result;
            if (customer) {
                result = await updateCustomer(customer.id, payload);
            } else {
                result = await createCustomer(payload);
            }

            if (result.success) {
                toast.success(customer ? "Cliente actualizado" : "Cliente creado", {
                    description: "Los datos se guardaron correctamente.",
                });
                onSuccess();
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre Completo *</FormLabel>
                            <FormControl>
                                <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="dni"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>DNI / CUIT</FormLabel>
                                <FormControl>
                                    <Input placeholder="12345678" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl>
                                    <Input placeholder="11 1234 5678" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="juan@ejemplo.com" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                                <Input placeholder="Av. Siempre Viva 123" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="credit_limit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Límite de Crédito ($)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-slate-500">
                                0 significa que debe autorizarse cada fiado, o ilimitado según política. Mejor poner un monto real.
                            </p>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Observaciones..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {customer ? 'Guardar Cambios' : 'Crear Cliente'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
