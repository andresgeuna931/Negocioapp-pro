'use client';

import Link from 'next/link';
import { X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TrialBannerProps {
    daysRemaining: number;
    isTrial: boolean;
}

export function TrialBanner({ daysRemaining, isTrial }: TrialBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isTrial || !isVisible) return null;

    // Colores según urgencia
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
