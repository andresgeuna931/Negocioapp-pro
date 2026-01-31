import { redirect } from 'next/navigation';
import { getTenantSettings, getSubscriptionStatus } from '@/lib/actions/auth';
import { PricingSection } from '@/components/subscriptions/pricing-section';

export default async function PricingPage() {
    const [tenant, subscription] = await Promise.all([
        getTenantSettings(),
        getSubscriptionStatus()
    ]);

    if (!tenant) {
        redirect('/login');
    }

    // Check if user is in trial period (14 days from account creation)
    let isInTrial = false;
    let trialDaysLeft = 0;

    if (tenant.created_at) {
        const createdAt = new Date(tenant.created_at);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        const now = new Date();

        if (now < trialEndDate) {
            isInTrial = true;
            trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    // Determine current plan:
    // - If in trial period → professional (trial gives access to all features)
    // - If has active subscription → use subscription plan
    // - Otherwise → fallback to tenant.plan_type or starter
    let currentPlanId: string;

    if (isInTrial) {
        currentPlanId = 'professional';
    } else if (subscription?.subscription?.plan_id) {
        currentPlanId = subscription.subscription.plan_id;
    } else {
        currentPlanId = tenant.plan_type || 'starter';
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    Elegí el plan perfecto para tu negocio
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Comenzá con una prueba gratuita de 14 días en nuestro plan Profesional.
                    Sin compromiso, cancelá cuando quieras.
                </p>
                {isInTrial && trialDaysLeft > 0 && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        Te quedan {trialDaysLeft} días de prueba del Plan Profesional
                    </div>
                )}
            </div>

            <PricingSection
                currentPlanId={currentPlanId}
                tenantId={tenant.id}
                isInTrial={isInTrial}
            />

            <div className="mt-16 text-center">
                <p className="text-slate-500 mb-4">¿Tenés preguntas sobre los planes?</p>
                <div className="flex justify-center gap-8 text-sm">
                    <div className="text-left">
                        <p className="font-semibold text-slate-900 dark:text-white">¿Puedo cambiar de plan después?</p>
                        <p className="text-slate-500 max-w-xs">Sí, podés subir o bajar de plan en cualquier momento desde esta misma página.</p>
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900 dark:text-white">¿Qué medios de pago aceptan?</p>
                        <p className="text-slate-500 max-w-xs">Aceptamos todas las tarjetas de crédito y débito a través de MercadoPago.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
