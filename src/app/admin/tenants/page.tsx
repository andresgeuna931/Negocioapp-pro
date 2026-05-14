import { getAllTenants } from '@/lib/actions/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Building2, Mail, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import { TenantActions } from '@/components/admin/tenant-actions';

export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
    const { tenants } = await getAllTenants();

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Negocios / Clientes</h1>
                    <p className="text-slate-500 mt-1">Lista completa de negocios registrados en el sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tenants.map((tenant) => {
                    const sub = tenant.subscriptions?.[0];
                    const settings = tenant.settings as any;
                    
                    // --- REFINED PLAN LOGIC ---
                    const hasSub = sub?.status === 'active' && sub?.plan && !['free', 'trial'].includes(sub.plan);
                    let planDisplay = settings?.plan_id || tenant.plan_type || 'starter';
                    
                    if (tenant.status === 'trial' && !hasSub) {
                        // Pure trial, no payment yet
                        planDisplay = 'profesional (prueba)';
                    } else if (hasSub) {
                        // Has paid - use the real plan from settings
                        planDisplay = settings?.plan_id || tenant.plan_type || 'professional';
                    }
                    
                    const isManual = sub?.payment_provider === 'manual_admin';

                    // --- REFINED EXPIRY LOGIC ---
                    let expiryDate = sub?.current_period_end;
                    if (!expiryDate && tenant.status === 'trial') {
                        // No subscription record, show trial end date
                        const trialEnd = new Date(tenant.created_at);
                        trialEnd.setDate(trialEnd.getDate() + 14);
                        expiryDate = trialEnd.toISOString();
                    }
                    
                    // --- REFINED EMAIL LOGIC ---
                    // Use business email first, then fallback to the owner's registration email
                    const ownerProfile = tenant.profiles?.find((p: any) => p.role === 'owner' || p.role === 'admin');
                    const displayEmail = tenant.email || ownerProfile?.email || 'Sin email';

                    return (
                        <Card key={tenant.id} className="overflow-hidden hover:border-purple-300 transition-all border-slate-200 dark:border-slate-800">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-6 h-6 text-slate-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tenant.name}</h3>
                                                {isManual && (
                                                    <Badge variant="info" size="sm" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                        Manual
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                <Mail className="w-3 h-3" /> {displayEmail}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <Badge variant={tenant.status === 'active' ? 'success' : tenant.status === 'trial' ? 'info' : 'danger'}>
                                                    {tenant.status.toUpperCase()}
                                                </Badge>
                                                <Badge variant="default" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                                                    PLAN: {planDisplay.toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:flex lg:items-center gap-10 border-t lg:border-t-0 pt-6 lg:pt-0">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold">
                                                <Calendar className="w-3 h-3" /> Creado
                                            </p>
                                            <p className="text-sm font-medium">{formatDate(tenant.created_at)}</p>
                                        </div>
                                        <div>
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {tenant.status === 'active' ? 'Próximo Cobro' : 'Vence Prueba'}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {expiryDate ? format(new Date(expiryDate), 'd/M/yy', { locale: es }) : '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <TenantActions tenantId={tenant.id} tenantName={tenant.name} />
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
