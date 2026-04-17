import { Check, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    // During trial, all plans are selectable. Only block the button if user has a PAID active subscription for this plan
    const isDisabled = hasPaidSubscription && isCurrent;

    return (
        <Card className={cn(
            "relative flex flex-col h-full transition-all duration-200",
            isPro ? "border-emerald-500 shadow-lg scale-105 z-10" : "border-slate-200 dark:border-slate-800 hover:border-emerald-200",
            isCurrent ? "bg-slate-50 dark:bg-slate-900/50" : "bg-white dark:bg-slate-900"
        )}>
            {isPro && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Recomendado
                    </span>
                </div>
            )}

            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span className="text-xl font-bold">{plan.name}</span>
                    {isCurrent && (
                        <Badge variant="success" className="ml-2">Actual</Badge>
                    )}
                </CardTitle>
                <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                    <span className="text-slate-500">/mes</span>
                </div>

                <div className="space-y-2 text-sm">
                    {/* Límites principales */}
                    <FeatureRow
                        included={true}
                        text={plan.limits.products === -1 ? 'Productos Ilimitados' : `Hasta ${plan.limits.products.toLocaleString()} productos`}
                        highlight={plan.limits.products === -1}
                    />
                    <FeatureRow
                        included={true}
                        text={plan.limits.users === 1 ? '1 usuario' : `Hasta ${plan.limits.users} usuarios`}
                    />

                    {/* Separador */}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-3" />

                    {/* Features principales */}
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
                        text={
                            plan.features.reports === 'basic' ? 'Reportes básicos' :
                                plan.features.reports === 'advanced' ? 'Reportes avanzados' :
                                    'Reportes avanzados'
                        }
                    />
                    <FeatureRow
                        included={plan.features.excel_reports_export}
                        text="Exportar a Excel"
                        tooltip="Descargar reportes en formato Excel"
                    />

                    {/* Soporte - Diferenciador */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Soporte</p>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className={cn(
                                "text-slate-700 dark:text-slate-300",
                                plan.id === 'business' && "font-medium text-emerald-600 dark:text-emerald-400"
                            )}>
                                {plan.id === 'starter' && 'Chatbot IA (Autogestión)'}
                                {plan.id === 'professional' && 'Chatbot + WhatsApp (Lun-Vie)'}
                                {plan.id === 'business' && 'WhatsApp Prioritario VIP'}
                                {plan.id === 'test' && 'Soporte Desarrollador (Pruebas)'}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className={cn(
                        "w-full",
                        isPro ? "bg-emerald-600 hover:bg-emerald-700" : ""
                    )}
                    variant={isDisabled ? "outline" : undefined}
                    disabled={isDisabled || loading}
                    onClick={() => onSelect?.(plan.id)}
                >
                    {isDisabled
                        ? 'Plan Actual'
                        : isInTrial && isCurrent
                            ? 'Suscribirme a este plan'
                            : hasPaidSubscription
                                ? 'Cambiar Plan'
                                : 'Elegir Plan'
                    }
                </Button>
            </CardFooter>
        </Card>
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
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {included ? (
                <Check className={cn(
                    "w-4 h-4 flex-shrink-0",
                    highlight ? "text-emerald-600" : "text-emerald-500"
                )} />
            ) : (
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
            <div className="flex items-center gap-1">
                <span
                    className={cn(
                        included
                            ? highlight
                                ? "text-slate-900 dark:text-slate-100 font-medium"
                                : "text-slate-700 dark:text-slate-300"
                            : "text-slate-400 line-through"
                    )}
                    title={tooltip}
                >
                    {text}
                </span>
                {tooltip && (
                    <span title={tooltip} className="cursor-help flex items-center">
                        <Info className="w-3 h-3 text-slate-400" />
                    </span>
                )}
            </div>
        </div>
    );
}
