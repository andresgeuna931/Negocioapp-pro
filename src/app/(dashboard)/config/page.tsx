import { Settings, Store, Bell, Users, CreditCard, Tag, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTenantSettings, getSubscriptionStatus, getTeamMembers } from '@/lib/actions/auth';
import { formatCurrency, formatDate, getSubscriptionStatusLabel } from '@/lib/utils';
import { TenantSettingsForm } from '@/components/config/tenant-settings-form';

export default async function ConfigPage() {
    const [tenant, subscriptionInfo, teamResult] = await Promise.all([
        getTenantSettings(),
        getSubscriptionStatus(),
        getTeamMembers(),
    ]);

    const team = teamResult.data || [];

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
                            <Badge
                                variant={
                                    subscriptionInfo?.tenant.status === 'active' ? 'success' :
                                        subscriptionInfo?.tenant.status === 'trial' ? 'info' :
                                            subscriptionInfo?.tenant.status === 'past_due' ? 'warning' : 'danger'
                                }
                            >
                                {getSubscriptionStatusLabel(subscriptionInfo?.tenant.status || '')}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Plan</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {subscriptionInfo?.subscription?.plan === 'basic' ? 'Básico' : 'Premium'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Vencimiento</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {subscriptionInfo?.subscription?.current_period_end
                                    ? formatDate(subscriptionInfo.subscription.current_period_end)
                                    : '-'}
                            </p>
                            {subscriptionInfo?.daysRemaining !== undefined && subscriptionInfo.daysRemaining <= 7 && (
                                <p className="text-xs text-amber-600">
                                    {subscriptionInfo.daysRemaining} días restantes
                                </p>
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

            {/* Team */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Equipo
                    </CardTitle>
                    <CardDescription>
                        Usuarios con acceso al sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {team.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                    {member.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {member.full_name}
                                    </p>
                                    <p className="text-sm text-slate-500">{member.email}</p>
                                </div>
                                <Badge variant={member.role === 'owner' ? 'success' : 'default'}>
                                    {member.role === 'owner' ? 'Dueño' : 'Empleado'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                        Para agregar nuevos usuarios, contactá al administrador del sistema.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
