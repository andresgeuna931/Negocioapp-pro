import { Store, Bell, CreditCard, Tag, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTenantSettings, getSubscriptionStatus, getTeamMembers, getCurrentSession } from '@/lib/actions/auth';
import { formatDate } from '@/lib/utils';
import { TenantSettingsForm, TeamManagement } from '@/components/config';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
    const [tenant, subscriptionInfo, teamResult, session] = await Promise.all([
        getTenantSettings(),
        getSubscriptionStatus(),
        getTeamMembers(),
        getCurrentSession(),
    ]);

    const team = teamResult.data || [];
    const isOwner = session?.profile.role === 'owner';

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Configuración
                </h1>
                <p className="text-slate-500">
                    Administrá tu negocio y preferencias
                </p>
            </div>

            {/* Subscription Card */}
            {(() => {
                const tenantCreatedAt = tenant?.created_at ? new Date(tenant.created_at) : null;
                const isActive = subscriptionInfo?.tenant.status === 'active';
                const isTenantTrial = subscriptionInfo?.tenant.status === 'trial';
                
                // Check if user has a real paid subscription (even while in trial)
                const hasPaidSub = !!(
                    subscriptionInfo?.subscription?.status === 'active' &&
                    subscriptionInfo?.subscription?.plan &&
                    !['free', 'trial'].includes(subscriptionInfo.subscription.plan)
                );

                let isTrial = false;
                let trialDaysLeft = 0;
                let planLabel = 'Sin plan';
                let expiryLabel = '-';
                let statusLabel = 'Vencido';
                let statusVariant: 'success' | 'info' | 'warning' | 'danger' = 'danger';

                // Get plan name from settings (most accurate) or fallback
                const settings = tenant?.settings as any;
                const planId = settings?.plan_id || tenant?.plan_type || subscriptionInfo?.subscription?.plan || 'starter';
                const planMap: Record<string, string> = {
                    starter: 'Starter',
                    professional: 'Profesional',
                    business: 'Business',
                    test: 'de Prueba',
                    basic: 'Starter',
                    premium: 'Profesional'
                };

                if (isActive || hasPaidSub) {
                    // User has paid — show active state
                    statusLabel = 'Activo';
                    statusVariant = 'success';
                    planLabel = planMap[planId] || planId;
                    expiryLabel = subscriptionInfo?.subscription?.current_period_end
                        ? formatDate(subscriptionInfo.subscription.current_period_end)
                        : '-';
                } else if (isTenantTrial && tenantCreatedAt) {
                    // Pure trial (no payment yet)
                    const trialEndDate = new Date(tenantCreatedAt);
                    trialEndDate.setDate(trialEndDate.getDate() + 14);
                    trialDaysLeft = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    isTrial = trialDaysLeft > 0;
                    
                    if (isTrial) {
                        statusLabel = 'Prueba';
                        statusVariant = 'info';
                        planLabel = 'Profesional (Prueba)';
                        expiryLabel = trialEndDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
                    } else {
                        statusLabel = 'Vencido';
                        statusVariant = 'danger';
                        planLabel = 'Vencido';
                        expiryLabel = 'Expirado';
                    }
                }

                return (
                    <Card className={
                        subscriptionInfo?.tenant.status === 'suspended'
                            ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                            : subscriptionInfo?.tenant.status === 'past_due'
                                ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                                : ''
                    }>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Suscripción
                            </CardTitle>
                            <CardDescription>
                                Estado de tu plan y facturación
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Estado</p>
                                    <Badge variant={statusVariant}>
                                        {statusLabel}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Plan</p>
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {planLabel}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">{(isActive || hasPaidSub) ? 'Próximo cobro' : 'Vencimiento'}</p>
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {expiryLabel}
                                    </p>
                                    {isTrial && trialDaysLeft <= 7 && (
                                        <p className="text-xs text-amber-600">
                                            {trialDaysLeft} días restantes
                                        </p>
                                    )}
                                    {isActive && (
                                        <Link href="/precios" className="text-xs text-emerald-500 hover:text-emerald-400 hover:underline font-medium mt-1 inline-block">
                                            Cambiar de plan →
                                        </Link>
                                    )}
                                    {!isActive && !isTrial && (
                                        <Link href="/precios" className="text-xs text-emerald-600 hover:underline">
                                            Ver planes →
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {subscriptionInfo?.tenant.status === 'suspended' && (
                                <div className="mt-4 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                    <p className="font-medium">⚠️ Tu cuenta está suspendida</p>
                                    <p className="text-sm mt-1">
                                        No podés realizar ventas ni editar productos. Contactá al administrador para renovar tu suscripción.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })()}

            {/* Business Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Store className="w-5 h-5" />
                        Datos del Negocio
                    </CardTitle>
                    <CardDescription>
                        Información general de tu kiosco
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tenant && <TenantSettingsForm tenant={tenant} />}
                </CardContent>
            </Card>

            {/* Stock Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Alertas de Stock
                    </CardTitle>
                    <CardDescription>
                        Configurá cuándo recibir alertas de stock bajo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                Umbral por defecto
                            </p>
                            <p className="text-sm text-slate-500">
                                Se alerta cuando el stock baja de este valor
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {tenant?.low_stock_threshold_default || 5}
                            </p>
                            <p className="text-sm text-slate-500">unidades</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                        Podés configurar un umbral diferente para cada producto en la edición del producto.
                    </p>
                </CardContent>
            </Card>

            {/* Price Lists */}
            <Link href="/config/precios">
                <Card className="cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all">
                    <CardContent className="py-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <Tag className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                    Listas de Precios
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Configurá precios para efectivo, tarjeta, mayorista, etc.
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Team Management */}
            <TeamManagement
                team={team}
                currentUserId={session?.user.id || ''}
                isOwner={isOwner}
            />
        </div>
    );
}
