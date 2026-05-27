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

// Helper to get current user's tenant_id and user id
async function getCurrentUserContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return null;
    return { supabase, user, tenantId: profile.tenant_id };
}

export async function getCustomers(query?: string): Promise<ApiResponse<Customer[]>> {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, tenantId } = ctx;

    try {
        let dbQuery = supabase
            .from('customers')
            .select(`
                *,
                account:customer_accounts(*)
            `)
            .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, tenantId } = ctx;

    try {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                account:customer_accounts(*)
            `)
            .eq('id', id)
            .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, tenantId } = ctx;

    try {
        const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
                tenant_id: tenantId,
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
        revalidatePath('/sales');
        return { success: true, data: newCustomer as Customer };
    } catch (error) {
        console.error('Unexpected error:', error);
        return { success: false, error: 'Error inesperado' };
    }
}

export async function updateCustomer(id: string, data: UpdateCustomerData): Promise<ApiResponse<Customer>> {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, tenantId } = ctx;

    try {
        const { data: updatedCustomer, error } = await supabase
            .from('customers')
            .update(data)
            .eq('id', id)
            .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, tenantId } = ctx;

    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);  // CRITICAL: Filter by tenant

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
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, user, tenantId } = ctx;

    // Get customer account - ensure it belongs to this tenant via customer
    const { data: account } = await supabase
        .from('customer_accounts')
        .select('id, tenant_id')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (!account) {
        return { success: false, error: 'Cuenta de cliente no encontrada' };
    }

    // Insert payment movement
    const { error } = await supabase
        .from('account_movements')
        .insert({
            tenant_id: tenantId,
            account_id: account.id,
            type: 'payment',
            amount: amount,
            description: notes || 'Pago a cuenta',
            created_by: user.id
        } as any);

    if (error) {
        console.error('Error registering payment:', error);
        return { success: false, error: 'Error al registrar pago' };
    }

    revalidatePath('/clientes');
    return { success: true };
}

export async function getCustomerMovements(customerId: string) {
    const ctx = await getCurrentUserContext();
    if (!ctx) return { success: false, error: 'No autorizado' };
    const { supabase, tenantId } = ctx;

    // Get account first, ensuring it belongs to this tenant
    const { data: account } = await supabase
        .from('customer_accounts')
        .select('id')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)  // CRITICAL: Filter by tenant
        .single();

    if (!account) return { success: false, error: 'Cuenta no encontrada' };

    const { data, error } = await supabase
        .from('account_movements')
        .select(`
            *,
            creator:profiles(full_name)
        `)
        .eq('account_id', account.id)
        .eq('tenant_id', tenantId)  // CRITICAL: Double-check tenant on movements too
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

    // Call RPC (RPC uses auth.uid() internally to scope to tenant)
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
