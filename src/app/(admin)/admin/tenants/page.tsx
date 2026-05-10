import { getAllTenants } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Building2, Mail, Calendar, CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
    const { tenants } = await getAllTenants();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Negocios / Clientes</h1>
                <p className="text-slate-500 mt-1">Lista completa de negocios registrados en el sistema</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tenants.map((tenant) => {
                    const sub = tenant.subscriptions?.[0];
                    return (
                        <Card key={tenant.id} className="overflow-hidden hover:border-purple-300 transition-all">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-6 h-6 text-slate-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tenant.name}</h3>
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                <Mail className="w-3 h-3" /> {tenant.email || 'Sin email'}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <Badge variant={tenant.status === 'active' ? 'success' : tenant.status === 'trial' ? 'info' : 'danger'}>
                                                    Estado: {tenant.status.toUpperCase()}
                                                </Badge>
                                                <Badge variant="outline" className="border-slate-300">
                                                    Plan: {(tenant.plan_type || 'Starter').toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:flex lg:items-center gap-8 border-t lg:border-t-0 pt-6 lg:pt-0">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Creado
                                            </p>
                                            <p className="text-sm font-medium">{formatDate(tenant.created_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <CreditCard className="w-3 h-3" /> Suscripción
                                            </p>
                                            <p className="text-sm font-medium">
                                                {sub ? (sub.status === 'active' ? 'Pagada' : 'Pendiente') : 'Sin datos'}
                                            </p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <button className="w-full lg:w-auto px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 transition-colors">
                                                Ver Detalle
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {tenants.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-500">No se encontraron negocios registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
