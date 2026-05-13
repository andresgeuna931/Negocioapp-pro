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
}

export function PricingCard({ planId, currentPlanId, onSelect, loading, isInTrial, hasPaidSubscription }: PricingCardProps) {
    const plan = getPlanDetails(planId);
    const isCurrent = currentPlanId === plan.id;
    const isPro = plan.id === 'professional';
    const isDisabled = hasPaidSubscription && isCurrent;

    return (
        <div className={cn(
            "relative flex flex-col h-full rounded-2xl border transition-all duration-300 overflow-hidden",
            isPro
                ? "border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.15)] scale-105 z-10 bg-slate-800"
                : "border-slate-700 bg-slate-800 hover:border-slate-500"
        )}>
            {/* Recommended badge */}
            {isPro && (
                <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                    Recomendado
                </div>
            )}

            <div className={cn("flex flex-col h-full p-6 gap-5")}>

                {/* Header */}
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

                {/* Price */}
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{formatPrice(plan.price)}</span>
                    <span className="text-slate-400 text-sm">/mes</span>
                </div>

                {/* Features */}
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

                    <FeatureRow included={plan.features.current_account} text="Cuentas Corrientes (Fiado)" tooltip="Vender a crédito y registrar deudas de clientes" highlight={plan.features.current_account} />
                    <FeatureRow included={plan.features.multi_price_lists} text="Listas de precios múltiples" tooltip="Precios diferenciados por mayorista, minorista, etc." />
                    <FeatureRow included={plan.features.bulk_products_update} text="Actualización masiva de precios" tooltip="Actualizar todos los precios por porcentaje" />
                    <FeatureRow included={true} text={plan.features.reports === 'basic' ? 'Reportes básicos' : 'Reportes avanzados'} />
                    <FeatureRow included={plan.features.excel_reports_export} text="Exportar a Excel" tooltip="Descargar reportes en formato Excel" />

                    {/* Support */}
                    <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Soporte</p>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className={cn(
                                "text-slate-300 text-sm",
                                plan.id === 'business' && "font-semibold text-emerald-400"
                            )}>
                                {plan.id === 'starter' && 'Chatbot IA (Autogestión)'}
                                {plan.id === 'professional' && 'Chatbot + WhatsApp (Lun-Vie)'}
                                {plan.id === 'business' && 'WhatsApp Prioritario VIP'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Button */}
                <button
                    className={cn(
                        "w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 mt-2",
                        isDisabled
                            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                            : isPro
                                ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                                : "border border-slate-500 text-white hover:bg-slate-700 hover:border-slate-400"
                    )}
                    disabled={isDisabled || !!loading}
                    onClick={() => onSelect?.(plan.id)}
                >
                    {loading
                        ? 'Procesando...'
                        : isDisabled
                            ? 'Plan Actual'
                            : isInTrial && isCurrent
                                ? 'Suscribirme a este plan'
                                : hasPaidSubscription
                                    ? 'Cambiar Plan'
                                    : 'Elegir Plan'
                    }
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
