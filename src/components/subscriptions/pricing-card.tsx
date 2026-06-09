import { Check, X, Info } from 'lucide-react';
import { PLANS, formatPrice, getPlanDetails } from '@/lib/config/plans';
import { cn } from '@/lib/utils';

interface PricingCardProps {
    planId: string;
    currentPlanId?: string;
    onSelect?: (planId: string) => void;
    loading?: boolean;
    isInTrial?: boolean;
    hasPaidSubscription?: boolean;
    isSuspended?: boolean;
}

export function PricingCard({ planId, currentPlanId, onSelect, loading, isInTrial, hasPaidSubscription, isSuspended }: PricingCardProps) {
    const plan = getPlanDetails(planId) as any;
    const isCurrent = currentPlanId === plan.id;
    const isPro = plan.id === 'professional';
    const isAnnual = plan.id.endsWith('_annual');
    const isDisabled = hasPaidSubscription && isCurrent;
    const isBusinessPlan = plan.id === 'business' || plan.id === 'business_annual';

    const supportText = () => {
        if (plan.id === 'starter') {
            return 'Chat en vivo Tawk.to (Autogestión)';
        }
        if (plan.id === 'professional' || plan.id === 'professional_annual') {
            return 'Chat en vivo Tawk.to (Lun-Vie horario comercial)';
        }
        if (plan.id === 'business' || plan.id === 'business_annual') {
            return 'Soporte VIP Telegram 24/7';
        }
        return '';
    };

    return (
        <div className={cn(
            "relative flex flex-col h-full rounded-2xl border transition-all duration-300 overflow-hidden",
            isPro
                ? "border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.15)] scale-105 z-10 bg-slate-800"
                : "border-slate-700 bg-slate-800 hover:border-slate-500"
        )}>
            {isPro && (
                <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                    Recomendado
                </div>
            )}

            {isAnnual && plan.savings && (
                <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                    Ahorrás {formatPrice(plan.savings)} pagando anual
                </div>
            )}

            <div className="flex flex-col h-full p-6 gap-5">

                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                        {isCurrent && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2">
                                Actual
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm min-h-[36px] leading-snug">{plan.description}</p>
                </div>

                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">{formatPrice(plan.price)}</span>
                        <span className="text-slate-400 text-sm">/{isAnnual ? 'año' : 'mes'}</span>
                    </div>
                    {isAnnual && plan.monthlyEquivalent && (
                        <p className="text-sm text-emerald-400 mt-1 font-medium">
                            Equivale a {formatPrice(plan.monthlyEquivalent)}/mes
                        </p>
                    )}
                </div>

                <div className="flex-1 space-y-2.5 text-sm">
                    <FeatureRow
                        included={true}
                        text={plan.limits.products === -1 ? 'Productos Ilimitados' : `Hasta ${plan.limits.products.toLocaleString()} productos`}
                        highlight={plan.limits.products === -1}
                    />
                    <FeatureRow
                        included={true}
                        text={plan.limits.users === 1 ? '1 usuario' : `Hasta ${plan.limits.users} usuarios`}
                    />

                    <div className="border-t border-slate-700 my-1" />

                    <FeatureRow
                        included={plan.features.current_account}
                        text="Cuentas Corrientes (Fiado)"
                        tooltip="Vender a crédito y registrar deudas de clientes"
                        highlight={plan.features.current_account}
                    />
                    <FeatureRow
                        included={plan.features.multi_price_lists}
                        text="Listas de precios múltiples"
                        tooltip="Precios diferenciados por mayorista, minorista, etc."
                    />
                    <FeatureRow
                        included={plan.features.bulk_products_update}
                        text="Actualización masiva de precios"
                        tooltip="Actualizar todos los precios por porcentaje"
                    />
                    <FeatureRow
                        included={true}
                        text={plan.features.reports === 'basic' ? 'Reportes básicos' : 'Reportes avanzados'}
                    />
                    <FeatureRow
                        included={plan.features.excel_reports_export}
                        text="Exportar a Excel"
                        tooltip="Descargar reportes en formato Excel"
                    />
                    <FeatureRow
                        included={true}
                        text="Módulo de Gastos"
                        tooltip="Registrá gastos del negocio y visualizá tu ganancia real"
                    />

                    <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Soporte</p>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className={cn(
                                "text-sm",
                                isBusinessPlan ? "font-semibold text-emerald-400" : "text-slate-300"
                            )}>
                                {supportText()}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => isSuspended && onSelect?.(plan.id)}
                    className={cn(
                        "w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 mt-2",
                        isSuspended
                            ? "bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer"
                            : isDisabled
                                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                    )}
                    disabled={!isSuspended}
                >
                    {isSuspended ? 'Reactivar con este plan' : isDisabled ? 'Plan Actual' : 'Contactanos para suscribirte'}
                </button>
            </div>
        </div>
    );
}

function FeatureRow({
    included,
    text,
    tooltip,
    highlight = false
}: {
    included: boolean;
    text: string;
    tooltip?: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            {included ? (
                <Check className={cn(
                    "w-4 h-4 flex-shrink-0",
                    highlight ? "text-emerald-400" : "text-emerald-500"
                )} />
            ) : (
                <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
            )}
            <div className="flex items-center gap-1">
                <span
                    className={cn(
                        included
                            ? highlight
                                ? "text-white font-semibold"
                                : "text-slate-200"
                            : "text-slate-600 line-through"
                    )}
                    title={tooltip}
                >
                    {text}
                </span>
                {tooltip && (
                    <span title={tooltip} className="cursor-help flex items-center">
                        <Info className="w-3 h-3 text-slate-500" />
                    </span>
                )}
            </div>
        </div>
    );
}
