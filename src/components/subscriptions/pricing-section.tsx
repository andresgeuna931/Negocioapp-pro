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
                throw new Error(data.error || 'Error al crear el checkout');
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
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                    {error}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                <PricingCard
                    planId="starter"
                    currentPlanId={currentPlanId}
                    onSelect={handleSelectPlan}
                    loading={loadingPlan === 'starter'}
                    isInTrial={isInTrial}
                    hasPaidSubscription={hasPaidSubscription}
                />
                <PricingCard
                    planId="professional"
                    currentPlanId={currentPlanId}
                    onSelect={handleSelectPlan}
                    loading={loadingPlan === 'professional'}
                    isInTrial={isInTrial}
                    hasPaidSubscription={hasPaidSubscription}
                />
                <PricingCard
                    planId="business"
                    currentPlanId={currentPlanId}
                    onSelect={handleSelectPlan}
                    loading={loadingPlan === 'business'}
                    isInTrial={isInTrial}
                    hasPaidSubscription={hasPaidSubscription}
                />
                <PricingCard
                    planId="test"
                    currentPlanId={currentPlanId}
                    onSelect={handleSelectPlan}
                    loading={loadingPlan === 'test'}
                    isInTrial={isInTrial}
                    hasPaidSubscription={hasPaidSubscription}
                />
            </div>
        </div>
    );
}
