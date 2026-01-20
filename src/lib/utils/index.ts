import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Format currency (Argentine Peso)
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

// Format number with decimals
export function formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

// Format date
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
    const d = new Date(date);

    switch (format) {
        case 'long':
            return new Intl.DateTimeFormat('es-AR', {
                dateStyle: 'long',
                timeStyle: 'short',
            }).format(d);
        case 'time':
            return new Intl.DateTimeFormat('es-AR', {
                timeStyle: 'short',
            }).format(d);
        default:
            return new Intl.DateTimeFormat('es-AR', {
                dateStyle: 'short',
            }).format(d);
    }
}

// Format relative time (e.g., "hace 5 minutos")
export function formatRelativeTime(date: string | Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return formatDate(date);
}

// Get unit label
export function getUnitLabel(unitType: string, qty: number = 1): string {
    const labels: Record<string, { singular: string; plural: string }> = {
        unit: { singular: 'unidad', plural: 'unidades' },
        kg: { singular: 'kg', plural: 'kg' },
        g: { singular: 'g', plural: 'g' },
        lt: { singular: 'lt', plural: 'lt' },
        ml: { singular: 'ml', plural: 'ml' },
    };

    const label = labels[unitType] || labels.unit;
    return qty === 1 ? label.singular : label.plural;
}

// Format quantity with unit
export function formatQuantity(qty: number, unitType: string): string {
    if (unitType === 'unit') {
        return `${Math.round(qty)} ${getUnitLabel(unitType, qty)}`;
    }
    return `${formatNumber(qty, 3)} ${getUnitLabel(unitType, qty)}`;
}

// Generate slug from text
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Check if running on mobile
export function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
}

// Validate barcode format
export function isValidBarcode(barcode: string): boolean {
    // EAN-13, EAN-8, UPC-A, UPC-E formats
    return /^[\d]{8,14}$/.test(barcode);
}

// Calculate stock status
export function getStockStatus(
    stock: number,
    threshold: number
): 'ok' | 'low' | 'critical' | 'out' {
    if (stock <= 0) return 'out';
    if (stock <= threshold * 0.5) return 'critical';
    if (stock <= threshold) return 'low';
    return 'ok';
}

// Get stock status color
export function getStockStatusColor(status: string): string {
    switch (status) {
        case 'out':
            return 'text-red-600 bg-red-50';
        case 'critical':
            return 'text-orange-600 bg-orange-50';
        case 'low':
            return 'text-yellow-600 bg-yellow-50';
        default:
            return 'text-green-600 bg-green-50';
    }
}

// Payment method labels
export function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
        cash: 'Efectivo',
        debit: 'Débito',
        credit: 'Crédito',
        transfer: 'Transferencia',
        mixed: 'Mixto',
    };
    return labels[method] || method;
}

// Subscription status labels
export function getSubscriptionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        trial: 'Prueba',
        active: 'Activa',
        past_due: 'Vencida',
        suspended: 'Suspendida',
        canceled: 'Cancelada',
    };
    return labels[status] || status;
}

// Subscription status colors
export function getSubscriptionStatusColor(status: string): string {
    switch (status) {
        case 'active':
            return 'text-green-600 bg-green-50';
        case 'trial':
            return 'text-blue-600 bg-blue-50';
        case 'past_due':
            return 'text-yellow-600 bg-yellow-50';
        case 'suspended':
        case 'canceled':
            return 'text-red-600 bg-red-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}
