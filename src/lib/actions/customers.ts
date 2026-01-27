'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Customer, ApiResponse } from '@/lib/types';

export interface CreateCustomerData {
    full_name: string;
    dni?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    credit_limit?: number;
}

export type UpdateCustomerData = Partial<CreateCustomerData> & { is_active?: boolean };

export async function getCustomers(query?: string): Promise<ApiResponse<Customer[]>> {
    const supabase = await createClient(); // Await added here if needed, depending on updated SDK usage, but standard nextjs template is async
    // Correct usage for server actions usually involves no await if it's the sync helper, but let's stick to pattern used in auth.ts

    try {
        let dbQuery = supabase
            .from('customers')
            .select(`
                *,
                account:customer_accounts(*)
            `)
            .order('full_name');

        if (query) {
            dbQuery = dbQuery.or(`full_name.ilike.%${query}%,dni.ilike.%${query}%`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            console.error('Error fetching customers:', error);
            return { success: false, error: 'Error al cargar clientes' };
        }

        return { success: true, data: data as Customer[] };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'Error inesperado' };
    }
}

export async function getCustomerById(id: string): Promise<ApiResponse<Customer>> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                account:customer_accounts(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        return { success: true, data: data as Customer };
    } catch (error) {
        return { success: false, error: 'Error inesperado' };
    }
}

export async function createCustomer(data: CreateCustomerData): Promise<ApiResponse<Customer>> {
    const supabase = await createClient();

    // Get tenant_id from auth session mostly handled by RLS, but for insert we need to act as authenticated user.
    // NOTE: RLS policy checks auth.uid(). We rely on default mapping or explicit if needed.
    // However, our table schema requires tenant_id. We must get it from the user's profile.

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    // Get profile to get tenant_id
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile) return { success: false, error: 'Perfil no encontrado' };

    try {
        const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
                tenant_id: profile.tenant_id,
                full_name: data.full_name,
                dni: data.dni,
                email: data.email,
                phone: data.phone,
                address: data.address,
                notes: data.notes,
                credit_limit: data.credit_limit || 0
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating customer:', error);
            return { success: false, error: 'Error al crear cliente' };
        }

        revalidatePath('/customers');
        revalidatePath('/sales'); // In case customer list allows selection there
        return { success: true, data: newCustomer as Customer };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'Error inesperado' };
    }
}

export async function updateCustomer(id: string, data: UpdateCustomerData): Promise<ApiResponse<Customer>> {
    const supabase = await createClient();
    try {
        const { data: updatedCustomer, error } = await supabase
            .from('customers')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating customer:', error);
            return { success: false, error: 'Error al actualizar cliente' };
        }

        revalidatePath('/customers');
        return { success: true, data: updatedCustomer as Customer };
    } catch (error) {
        return { success: false, error: 'Error inesperado' };
    }
}

export async function deleteCustomer(id: string): Promise<ApiResponse<void>> {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting customer:', error);
            return { success: false, error: 'Error al eliminar cliente' };
        }

        revalidatePath('/customers');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Error inesperado' };
    }
}

export async function registerPayment(customerId: string, amount: number, notes?: string): Promise<ApiResponse<void>> {
    const supabase = await createClient();

    // 1. Get user for tenant_id (optional safety check usually handled by RLS but good for auditing)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autorizado' };

    // 2. Get customer account
    const { data: account } = await supabase
        .from('customer_accounts')
        .select('id, tenant_id')
        .eq('customer_id', customerId)
        .single();

    if (!account) {
        return { success: false, error: 'Cuenta de cliente no encontrada' };
    }

    // 3. Insert payment movement
    // Trigger `update_account_balance` will automatically decrease debt
    const { error } = await supabase
        .from('account_movements')
        .insert({
            tenant_id: account.tenant_id,
            account_id: account.id,
            type: 'payment',
            amount: amount,
            description: notes || 'Pago a cuenta',
            created_by: (await supabase.from('profiles').select('id').eq('id', user.id).single()).data?.id
        } as any);

    if (error) {
        console.error('Error registering payment:', error);
        return { success: false, error: 'Error al registrar pago' };
    }

    revalidatePath('/clientes');
    // Also revalidate sales if we show status there?
    return { success: true };
}

export async function getCustomerMovements(customerId: string) {
    const supabase = await createClient();

    // Get account first
    const { data: account } = await supabase
        .from('customer_accounts')
        .select('id')
        .eq('customer_id', customerId)
        .single();

    if (!account) return { success: false, error: 'Cuenta no encontrada' };

    const { data, error } = await supabase
        .from('account_movements')
        .select(`
            *,
            creator:profiles(full_name)
        `)
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching movements:', error);
        return { success: false, error: 'Error al cargar movimientos' };
    }

    return { success: true, data };
}

export async function importCustomers(
    customers: {
        full_name: string;
        dni?: string;
        email?: string;
        phone?: string;
        address?: string;
        credit_limit?: number;
        initial_balance?: number;
    }[]
) {
    const supabase = await createClient();

    // Call RPC
    const { data: result, error } = await supabase.rpc('import_customers_with_balance', {
        p_customers: customers
    });

    if (error) {
        console.error('RPC Import Error:', error);
        return { success: false, error: 'Error al procesar importación: ' + error.message };
    }

    // result type is JSONB, cast it
    const summary = result as { success: boolean; created_count: number; errors: string[] };

    revalidatePath('/clientes');
    return {
        success: summary.success,
        created: summary.created_count,
        errors: summary.errors.length > 0 ? summary.errors : null
    };
}
