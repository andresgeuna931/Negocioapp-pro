import { Check, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLANS, formatPrice, getPlanDetails } from '@/lib/config/plans';
import { cn } from '@/lib/utils';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PricingCardProps {
    planId: string;
    currentPlanId?: string;
    onSelect?: (planId: string) => void;
    loading?: boolean;
}

export function PricingCard({ planId, currentPlanId, onSelect, loading }: PricingCardProps) {
    const plan = getPlanDetails(planId);
    const isCurrent = currentPlanId === plan.id;
    const isPro = plan.id === 'professional';

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
            <CardContent className="flex-1 space-y-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                    <span className="text-slate-500">/mes</span>
                </div>

                <div className="space-y-3 text-sm">
                    {/* Límites */}
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="font-medium">
                            {plan.limits.products === -1 ? 'Productos Ilimitados' : `Hasta ${plan.limits.products} productos`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>
                            {plan.limits.users === 1 ? '1 usuario' : `Hasta ${plan.limits.users} usuarios`}
                        </span>
                    </div>

                    {/* Features Clave */}
                    <FeatureRow
                        included={plan.features.current_account}
                        text="Cuentas Corrientes (Fiado)"
                        tooltip="Permite vender a crédito y registrar deudas de clientes"
                    />
                    <FeatureRow
                        included={plan.features.multi_branch}
                        text="Multi-sucursal (Próximamente)"
                    />

                    {/* Soporte - Diferenciador */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Soporte</p>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-700 dark:text-slate-300">
                                {plan.id === 'starter' && 'Chatbot IA (Autogestión)'}
                                {plan.id === 'professional' && 'Chatbot + WhatsApp (Lun-Vie)'}
                                {plan.id === 'business' && 'WhatsApp Prioritario VIP'}
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
                    variant={isCurrent ? "outline" : undefined}
                    disabled={isCurrent || loading}
                    onClick={() => onSelect?.(plan.id)}
                >
                    {isCurrent ? 'Plan Actual' : 'Elegir Plan'}
                </Button>
            </CardFooter>
        </Card>
    );
}

function FeatureRow({ included, text, tooltip }: { included: boolean; text: string; tooltip?: string }) {
    return (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {included ? (
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
            <div className="flex items-center gap-1">
                <span
                    className={included ? "text-slate-900 dark:text-slate-200" : "text-slate-400 line-through"}
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
