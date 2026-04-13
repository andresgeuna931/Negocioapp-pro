'use client';

import Link from 'next/link';
import { X, Clock, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TrialBannerProps {
    daysRemaining: number;
    isTrial: boolean;
    isExpired?: boolean;
    hasPaidSubscription?: boolean;
    paidPlanName?: string;
    subscriptionDaysLeft?: number;
}

export function TrialBanner({
    daysRemaining,
    isTrial,
    isExpired = false,
    hasPaidSubscription = false,
    paidPlanName,
    subscriptionDaysLeft,
}: TrialBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    // STATE 5: Active paid subscription (not in trial anymore)
    if (!isTrial && !isExpired && hasPaidSubscription) {
        if (!isVisible) return null;
        return (
            <div className="w-full bg-emerald-600 text-white px-4 py-3 shadow-md relative z-40">
                <div className="flex items-center justify-between container mx-auto max-w-7xl">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm md:text-base">
                            Plan {paidPlanName || 'Activo'} — {subscriptionDaysLeft !== undefined && subscriptionDaysLeft > 0
                                ? `Se renueva en ${subscriptionDaysLeft} días`
                                : 'Activo'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/precios">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-xs h-7"
                            >
                                Gestionar plan
                            </Button>
                        </Link>
                        <button onClick={() => setIsVisible(false)} className="text-white/80 hover:text-white p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // STATE 4: Expired — no paid subscription — CANNOT be dismissed
    if (isExpired && !hasPaidSubscription) {
        return (
            <div className="w-full bg-red-600 text-white px-4 py-4 shadow-md relative z-40">
                <div className="flex items-center justify-between container mx-auto max-w-7xl">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
                        <div>
                            <span className="font-bold text-sm md:text-base block">
                                Tu período de prueba ha finalizado
                            </span>
                            <span className="text-red-100 text-xs md:text-sm">
                                Suscribite para seguir usando todas las funciones de NegocioApp Pro.
                            </span>
                        </div>
                    </div>
                    <Link href="/precios">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white text-red-600 hover:bg-red-50 border-none font-bold text-xs md:text-sm h-9 px-5 whitespace-nowrap"
                        >
                            Ver Planes
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // STATE 2: Trial + Already paid — show confirmation
    if (isTrial && hasPaidSubscription) {
        if (!isVisible) return null;
        return (
            <div className="w-full bg-emerald-600 text-white px-4 py-3 shadow-md relative z-40">
                <div className="flex items-center justify-between container mx-auto max-w-7xl">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm md:text-base">
                            ✅ Suscripción confirmada — Plan {paidPlanName}.
                            Tu plan pago arranca en {daysRemaining} días (al terminar la prueba).
                        </span>
                    </div>
                    <button onClick={() => setIsVisible(false)} className="text-white/80 hover:text-white p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // STATE 1 & 3: Trial active (no paid sub) — dismissible
    if (!isTrial || !isVisible) return null;

    const urgency =
        daysRemaining <= 3 ? 'danger' :
            daysRemaining <= 7 ? 'warning' : 'info';

    const bgColors = {
        danger: 'bg-red-600',
        warning: 'bg-amber-500',
        info: 'bg-indigo-600',
    };

    return (
        <div className={cn("w-full text-white px-4 py-3 shadow-md flex items-center justify-between relative z-40", bgColors[urgency])}>
            <div className="flex items-center gap-3 container mx-auto max-w-7xl">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" />
                    <span className="font-medium text-sm md:text-base">
                        Te quedan {daysRemaining} días de prueba gratuita del Plan Profesional.
                    </span>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                    <Link href="/precios">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white text-slate-900 hover:bg-slate-100 border-none font-semibold text-xs md:text-sm h-8"
                        >
                            Suscribirme ahora
                        </Button>
                    </Link>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-white/80 hover:text-white p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
