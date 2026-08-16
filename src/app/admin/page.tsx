import { getAdminMetrics, getDemoUsersStatus } from '@/lib/actions/admin';
import { listTenantInvitations, createTenantInvitation } from '@/lib/actions/tenant-invitations';
import { getTotalMonthlyCommissions } from '@/lib/actions/sellers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, TrendingUp, Link2, CheckCircle2, Clock, XCircle, FlaskConical, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PLANS, formatPrice } from '@/lib/config/plans';
import { InvitationManager } from '@/components/admin/invitation-manager';
import { DemoUsersToggle } from '@/components/admin/demo-users-toggle';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const metrics = await getAdminMetrics();
    const { invitations = [] } = await listTenantInvitations();
    const demoStatus = await getDemoUsersStatus();
    const { totalCommissions = 0, sellerBreakdown = [] } = await getTotalMonthlyCommissions();

    const netRevenue = metrics.revenueEstimate - totalCommissions;
    const commissionPct = metrics.revenueEstimate > 0
        ? Math.round((totalCommissions / metrics.revenueEstimate) * 100)
        : 0;
    const netPct = 100 - commissionPct;

    // SVG donut (circumference ≈ 100 para r=15.9)
    const netDash   = netPct;
    const commDash  = commissionPct;

    const statCards = [
        {
            title: 'Negocios Totales',
            value: metrics.totalTenants,
            icon: Building2,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            title: 'Suscripciones Activas',
            value: metrics.activeSubscriptions,
            icon: CreditCard,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            title: 'Usuarios Registrados',
            value: metrics.totalUsers,
            icon: Users,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            title: 'Ingresos Est. (Mensual)',
            value: formatCurrency(metrics.revenueEstimate),
            icon: TrendingUp,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
    ];

    const now = new Date();
    const invitacionesPendientes = invitations.filter((i: any) => !i.used_at && new Date(i.expires_at) > now);
    const invitacionesUsadas = invitations.filter((i: any) => i.used_at);
    const invitacionesVencidas = invitations.filter((i: any) => !i.used_at && new Date(i.expires_at) <= now);
    const currentMonth = now.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Panel de Control Global</h1>
                <p className="text-slate-500 mt-1">Resumen del estado actual de NegocioApp Pro</p>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── DESGLOSE DE INGRESOS ─── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Desglose de Ingresos</h2>
                        <p className="text-sm text-slate-500">MRR bruto, comisiones de vendedores e ingreso neto — {currentMonth}</p>
                    </div>
                </div>

                {/* Hero row */}
                <Card>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                            <div className="pr-6">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">MRR Bruto</p>
                                <p className="text-2xl font-bold">{formatCurrency(metrics.revenueEstimate)}</p>
                                <p className="text-xs text-slate-400 mt-1">{metrics.activeSubscriptions} suscripciones activas</p>
                            </div>
                            <div className="px-6">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Comisiones Vendedores</p>
                                <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalCommissions)}</p>
                                <p className="text-xs text-slate-400 mt-1">{sellerBreakdown.length} vendedor{sellerBreakdown.length !== 1 ? 'es' : ''} activo{sellerBreakdown.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="pl-6">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ingreso Neto</p>
                                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(netRevenue)}</p>
                                <p className="text-xs text-slate-400 mt-1">después de comisiones</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dona + detalle */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex gap-8 items-center">

                            {/* Donut SVG */}
                            <div className="relative flex-shrink-0 w-36 h-36">
                                <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90">
                                    {/* track */}
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        className="stroke-slate-100 dark:stroke-slate-800"
                                        strokeWidth="3.5" />
                                    {/* comisiones */}
                                    {commDash > 0 && (
                                        <circle cx="18" cy="18" r="15.9" fill="none"
                                            stroke="#f59e0b"
                                            strokeWidth="3.5"
                                            strokeDasharray={`${commDash} ${netDash}`}
                                            strokeDashoffset="0"
                                            strokeLinecap="round" />
                                    )}
                                    {/* neto */}
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke="#10b981"
                                        strokeWidth="3.5"
                                        strokeDasharray={`${netDash} ${commDash}`}
                                        strokeDashoffset={`-${commDash}`}
                                        strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Neto</p>
                                    <p className="text-sm font-bold text-emerald-500 leading-tight mt-0.5">{formatCurrency(netRevenue)}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{netPct}%</p>
                                </div>
                            </div>

                            {/* Leyenda + vendedores */}
                            <div className="flex-1 space-y-4">
                                {/* Leyenda */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Distribución</p>
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                        <span className="text-sm text-slate-500 flex-1">Ingreso neto (tuyo)</span>
                                        <span className="text-xs text-slate-400">{netPct}%</span>
                                        <span className="text-sm font-bold text-emerald-500 w-24 text-right">{formatCurrency(netRevenue)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                                        <span className="text-sm text-slate-500 flex-1">Comisiones vendedores</span>
                                        <span className="text-xs text-slate-400">{commissionPct}%</span>
                                        <span className="text-sm font-bold text-amber-500 w-24 text-right">{formatCurrency(totalCommissions)}</span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-800" />

                                {/* Por vendedor */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Por vendedor</p>
                                    {sellerBreakdown.length === 0 && (
                                        <p className="text-xs text-slate-400">Sin vendedores activos</p>
                                    )}
                                    <div className="space-y-2">
                                        {sellerBreakdown.map((s: any) => (
                                            <div key={s.sellerId} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                    {s.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium flex-1">{s.fullName}</span>
                                                <span className="text-xs text-slate-400">{s.commissionPct}% · {s.activeClients} cliente{s.activeClients !== 1 ? 's' : ''}</span>
                                                <span className="text-sm font-bold text-amber-500">{formatCurrency(s.commission)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    Comisiones proyectadas. Para ver pagos realizados, ir a Vendedores.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── USUARIOS DEMO ─── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <FlaskConical className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Usuarios Demo</h2>
                        <p className="text-sm text-slate-500">Habilitá o deshabilitá el acceso a las cuentas de demostración</p>
                    </div>
                </div>
                <DemoUsersToggle initialOwner={demoStatus.owner} initialStaff={demoStatus.staff} />
            </div>

            {/* ─── SECCIÓN DE INVITACIONES ─── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Link2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Links de Invitación</h2>
                        <p className="text-sm text-slate-500">Generá links únicos para que nuevos clientes se registren</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-4 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <div>
                                <p className="text-2xl font-bold">{invitacionesPendientes.length}</p>
                                <p className="text-xs text-slate-500">Pendientes</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <div>
                                <p className="text-2xl font-bold">{invitacionesUsadas.length}</p>
                                <p className="text-xs text-slate-500">Usadas</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="text-2xl font-bold">{invitacionesVencidas.length}</p>
                                <p className="text-xs text-slate-500">Vencidas</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <InvitationManager invitations={invitations} />
            </div>

            {/* Próximos Pasos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Próximos Pasos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <h3 className="font-semibold mb-1">Ver lista de clientes</h3>
                            <p className="text-sm text-slate-500 mb-3">Revisá quiénes se registraron y cuál es su estado.</p>
                            <a href="/admin/tenants" className="text-sm font-medium text-purple-600 hover:underline">Ver negocios →</a>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-50">
                            <h3 className="font-semibold mb-1">Logs del Sistema (Próximamente)</h3>
                            <p className="text-sm text-slate-500">Monitoreo de errores y webhooks en tiempo real.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border-purple-500/20">
                    <CardHeader>
                        <CardTitle className="text-purple-600 dark:text-purple-400">Modo Administrador</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Desde este panel tenés acceso total a todos los datos del sistema.
                            Podés gestionar negocios, ver facturación y realizar tareas de mantenimiento global.
                            <br /><br />
                            <b>Atención:</b> Los cambios realizados aquí impactan directamente en la producción de tus clientes.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
