import { getAdminMetrics } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const metrics = await getAdminMetrics();

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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Panel de Control Global</h1>
                <p className="text-slate-500 mt-1">Resumen del estado actual de NegocioApp Pro</p>
            </div>

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
