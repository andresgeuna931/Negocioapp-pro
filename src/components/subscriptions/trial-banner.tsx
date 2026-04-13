'use client';

import Link from 'next/link';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TrialBannerProps {
    daysRemaining: number;
    isTrial: boolean;
    isExpired?: boolean;
}

export function TrialBanner({ daysRemaining, isTrial, isExpired = false }: TrialBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    // Expired banner — always visible, cannot be dismissed
    if (isExpired) {
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

    // Trial banner — can be dismissed
    if (!isTrial || !isVisible) return null;

    // Colors based on urgency
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
                        {daysRemaining <= 0
                            ? "Tu periodo de prueba ha finalizado."
                            : `Te quedan ${daysRemaining} días de prueba gratuita del Plan Profesional.`}
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
