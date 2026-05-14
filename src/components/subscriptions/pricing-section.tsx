'use client';

import { useState } from 'react';
import { PricingCard } from './pricing-card';
import { PLANS } from '@/lib/config/plans';

interface PricingSectionProps {
    currentPlanId: string;
    tenantId: string;
    isInTrial?: boolean;
    hasPaidSubscription?: boolean;
}

export function PricingSection({ currentPlanId, tenantId, isInTrial, hasPaidSubscription }: PricingSectionProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSelectPlan = async (planId: string) => {
        setLoadingPlan(planId);
        setError(null);

        try {
            // Call our checkout API
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planId }),
            });

            const data = await response.json();

            if (!response.ok) {
                // If there's detailed info, we want to know it
                const errorMsg = data.details 
                    ? `${data.error} (${data.details})` 
                    : (data.error || 'Error al crear el checkout');
                throw new Error(errorMsg);
            }

            // Redirect to Mercado Pago checkout
            const checkoutUrl = data.init_point || data.sandbox_init_point;

            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error('No se recibió URL de pago');
            }

        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Error al procesar el pago');
            setLoadingPlan(null);
        }
    };

    return (
        <div>
            {error && (
                <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-xl text-red-700 shadow-sm max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-2 font-bold text-lg text-red-800">
                        ⚠️ Error al conectar con MercadoPago
                    </div>
                    <p className="text-center font-medium">{error}</p>
                    <p className="text-xs text-center mt-4 opacity-70 italic border-t border-red-200 pt-4">
                        💡 **Tip para pruebas**: No podés usar tu propio mail de MercadoPago para suscribirte. Usá un mail distinto (ej. el de tu hermano).
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
                {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => {
                    const plan = PLANS[key];
                    return (
                        <PricingCard
                            key={plan.id}
                            planId={plan.id}
                            currentPlanId={currentPlanId}
                            onSelect={handleSelectPlan}
                            loading={loadingPlan === plan.id}
                            isInTrial={isInTrial}
                            hasPaidSubscription={hasPaidSubscription}
                        />
                    );
                })}
            </div>
        </div>
    );
}
