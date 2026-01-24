'use client';

import { useState } from 'react';
import { PricingCard } from './pricing-card';
import { PLANS } from '@/lib/config/plans';
// import { useToast } from '@/components/ui/use-toast';
// import { createSubscriptionPreference } from '@/lib/actions/mercadopago'; // Future implementation

interface PricingSectionProps {
    currentPlanId: string;
    tenantId: string;
}

export function PricingSection({ currentPlanId, tenantId }: PricingSectionProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    // const { toast } = useToast();

    const handleSelectPlan = async (planId: string) => {
        setLoadingPlan(planId);

        // TODO: Implement MercadoPago integration here
        // const result = await createSubscriptionPreference(planId);

        // Simulation for now
        setTimeout(() => {
            alert("Próximamente: La integración con MercadoPago estará lista muy pronto.");
            // toast({
            //     title: "Próximamente",
            //     description: "La integración con MercadoPago estará lista muy pronto.",
            // });
            setLoadingPlan(null);
        }, 500);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <PricingCard
                planId="starter"
                currentPlanId={currentPlanId}
                onSelect={handleSelectPlan}
                loading={loadingPlan === 'starter'}
            />
            <PricingCard
                planId="professional"
                currentPlanId={currentPlanId}
                onSelect={handleSelectPlan}
                loading={loadingPlan === 'professional'}
            />
            <PricingCard
                planId="business"
                currentPlanId={currentPlanId}
                onSelect={handleSelectPlan}
                loading={loadingPlan === 'business'}
            />
        </div>
    );
}
