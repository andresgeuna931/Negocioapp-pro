import { redirect } from 'next/navigation';
import { getTenantSettings, getSubscriptionStatus } from '@/lib/actions/auth';
import { PricingCard } from '@/components/subscriptions/pricing-card'; // We will create a client wrapper for interactivity
import { PricingSection } from '@/components/subscriptions/pricing-section';

export default async function PricingPage() {
    const [tenant, subscription] = await Promise.all([
        getTenantSettings(),
        getSubscriptionStatus()
    ]);

    if (!tenant) {
        redirect('/login');
    }

    // Determine current plan from subscription or tenant default
    // If strict subscription logic is not fully active yet, fallback to tenant.plan_type
    const currentPlanId = subscription?.subscription?.plan_id || tenant.plan_type || 'starter';

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
            </div>

            <PricingSection currentPlanId={currentPlanId} tenantId={tenant.id} />

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
