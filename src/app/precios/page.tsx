import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTenantSettings, getSubscriptionStatus, getCurrentSession } from '@/lib/actions/auth';
import { PricingSection } from '@/components/subscriptions/pricing-section';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
    const [session, tenant, subscriptionStatus] = await Promise.all([
        getCurrentSession(),
        getTenantSettings(),
        getSubscriptionStatus()
    ]);

    if (!tenant) {
        redirect('/login');
    }

    if (session?.profile?.role !== 'owner') {
        redirect('/');
    }

    const subscription = subscriptionStatus?.subscription;

    const hasPaidSubscription = tenant.status === 'active' || !!(
        subscription &&
        subscription.status === 'active'
    );

    let isInTrial = false;
    let trialDaysLeft = 0;

    if (!hasPaidSubscription && tenant.created_at) {
        const createdAt = new Date(tenant.created_at);
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        const now = new Date();

        if (now < trialEndDate) {
            isInTrial = true;
            trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    const rawPlanId = subscription?.plan || subscription?.plan_id || 'none';
    const normalizedPlanId = rawPlanId === 'premium' ? 'professional' : rawPlanId;

    let currentPlanId: string;
    if (hasPaidSubscription) {
        currentPlanId = (normalizedPlanId && normalizedPlanId !== 'none')
            ? normalizedPlanId
            : 'professional';
    } else if (isInTrial) {
        currentPlanId = 'professional';
    } else {
        currentPlanId = 'none';
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto pt-6 px-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                </Link>
            </div>

            <div className="max-w-6xl mx-auto py-8 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Elegí el plan perfecto para tu negocio
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        {hasPaidSubscription
                            ? 'Gestioná tu suscripción o cambiá de plan.'
                            : 'Comenzá con una prueba gratuita en nuestro plan Profesional. Sin compromiso, cancelá cuando quieras.'
                        }
                    </p>
                    {isInTrial && trialDaysLeft > 0 && !hasPaidSubscription && (
                        <div className="mt-6 inline-flex items-center gap-3 bg-slate-800 text-slate-100 px-6 py-2.5 rounded-full text-sm font-semibold border border-slate-700">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Te quedan {trialDaysLeft} días de prueba del Plan Profesional
                        </div>
                    )}
                </div>

                <PricingSection
                    currentPlanId={currentPlanId}
                    tenantId={tenant.id}
                    isInTrial={isInTrial}
                    hasPaidSubscription={hasPaidSubscription}
                />

                <div className="mt-16 text-center">
                    <p className="text-slate-500 mb-4">¿Tenés preguntas sobre los planes?</p>
                    <div className="flex justify-center gap-8 text-sm">
                        <div className="text-left">
                            <p className="font-semibold text-white">¿Puedo cambiar de plan después?</p>
                            <p className="text-slate-400 max-w-xs">Sí, podés subir o bajar de plan en cualquier momento desde esta misma página.</p>
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-white">¿Qué medios de pago aceptan?</p>
                            <p className="text-slate-400 max-w-xs">Aceptamos todas las tarjetas de crédito y débito a través de MercadoPago.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
