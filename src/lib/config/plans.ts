export const PLANS = {
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 18000,
        mercadopago_plan_id: process.env.NEXT_PUBLIC_MP_PLAN_STARTER, 
        limits: {
            products: 1000,
            users: 1,
        },
        features: {
            multi_price_lists: true,
            cash_control: true,
            reports: 'basic',
            support: 'chatbot',
            current_account: false,
            bulk_products_update: true,
            excel_reports_export: false,
        },
        description: 'Ideal para kioscos pequeños que recién empiezan.'
    },
    PROFESSIONAL: {
        id: 'professional',
        name: 'Profesional',
        price: 35000,
        mercadopago_plan_id: process.env.NEXT_PUBLIC_MP_PLAN_PROFESSIONAL,
        limits: {
            products: 5000,
            users: 2,
        },
        features: {
            multi_price_lists: true,
            cash_control: true,
            reports: 'advanced',
            support: 'whatsapp_business',
            current_account: true,
            bulk_products_update: true,
            excel_reports_export: true,
        },
        description: 'Para negocios en crecimiento que necesitan gestión de clientes.'
    },
    BUSINESS: {
        id: 'business',
        name: 'Business',
        price: 49990,
        mercadopago_plan_id: process.env.NEXT_PUBLIC_MP_PLAN_BUSINESS,
        limits: {
            products: -1,
            users: 5,
        },
        features: {
            multi_branch: true,
            multi_price_lists: true,
            cash_control: true,
            reports: 'advanced_excel',
            support: 'priority',
            current_account: true,
            bulk_products_update: true,
            excel_reports_export: true,
            audit_logs: true,
        },
        description: 'Gestión total sin límites para comercios establecidos.'
    },
    TEST: {
        id: 'test',
        name: 'Plan de Prueba',
        price: 20,
        mercadopago_plan_id: process.env.NEXT_PUBLIC_MP_PLAN_TEST,
        limits: {
            products: 10,
            users: 1,
        },
        features: {
            multi_price_lists: true,
            cash_control: true,
            reports: 'basic',
            support: 'chatbot',
            current_account: false,
            bulk_products_update: true,
            excel_reports_export: false,
        },
        description: 'Usa este plan para probar el sistema de cobro real por solo $10.'
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
