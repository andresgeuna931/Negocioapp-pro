export const PLANS = {
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 18000,
        limits: {
            products: 1000,
            users: 1,
        },
        features: {
            multi_price_lists: true,
            cash_control: true,
            reports: 'basic',
            support: 'chatbot', // Autogestión 100%
            current_account: false,
            bulk_products_update: true, // ✅ CRITICO: Permitir actualizar precios por inflación
            excel_reports_export: false, // ❌ GANCHO: No pueden sacar la data para el contador
        },
        description: 'Ideal para kioscos pequeños que recién empiezan.'
    },
    PROFESSIONAL: {
        id: 'professional',
        name: 'Profesional',
        price: 35000,
        limits: {
            products: 5000,
            users: 2,
        },
        features: {
            multi_price_lists: true,
            cash_control: true,
            reports: 'advanced',
            support: 'whatsapp_business', // Horario comercial
            current_account: true, // ✅ FEATURE ESTRELLA
            bulk_products_update: true,
            excel_reports_export: true,
        },
        description: 'Para negocios en crecimiento que necesitan gestión de clientes.'
    },
    BUSINESS: {
        id: 'business',
        name: 'Business',
        price: 49990,
        limits: {
            products: -1, // Ilimitado
            users: 5, // ✅ AUMENTADO: De 3 a 5 para cubrir turnos rotativos
        },
        features: {
            multi_branch: true, // ✅ CRITICO: Multi-sucursal incluido (Shopify cobra extra)
            multi_price_lists: true,
            cash_control: true,
            reports: 'advanced_excel',
            support: 'priority', // Prioridad en respuesta
            current_account: true,
            bulk_products_update: true,
            excel_reports_export: true,
            audit_logs: true, // ✅ SEGURIDAD: Control de dueños ausentes
        },
        description: 'Gestión total sin límites para comercios establecidos.'
    }
} as const;

export type PlanType = keyof typeof PLANS;
export type PlanId = typeof PLANS[PlanType]['id'];

export function getPlanDetails(planId: string) {
    return Object.values(PLANS).find(p => p.id === planId) || PLANS.STARTER;
}

export function formatPrice(price: number) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(price);
}
