export const EXPENSE_CATEGORIES = [
    'Mercadería',
    'Alquiler',
    'Electricidad',
    'Agua',
    'Gas',
    'Internet/Teléfono',
    'Sueldos',
    'Limpieza',
    'Mantenimiento',
    'Impuestos',
    'Otros',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
    id: string;
    tenant_id: string;
    amount: number;
    category: string;
    description: string | null;
    date: string;
    created_at: string;
}
