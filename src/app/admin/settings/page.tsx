import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, BellRing } from 'lucide-react';
import { getMaintenanceMode, setMaintenanceMode } from '@/lib/actions/system-settings';
import { revalidatePath } from 'next/cache';

export default async function AdminSettingsPage() {
    const isMaintenanceOn = await getMaintenanceMode();

    async function toggleMaintenance() {
        'use server';
        await setMaintenanceMode(!isMaintenanceOn);
        revalidatePath('/admin/settings');
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configuración del Sistema</h1>
                <p className="text-slate-500 mt-1">Ajustes globales para NegocioApp Pro</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-purple-500" />
                            Anuncio Global
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Próximamente: Podrás enviar un mensaje que aparecerá en el dashboard de todos tus clientes.
                        </p>
                        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-sm">
                            Funcionalidad en desarrollo
                        </div>
                    </CardContent>
                </Card>

                <Card className={isMaintenanceOn ? 'border-red-500' : 'border-red-500/20'}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            Modo Mantenimiento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 mb-4">
                            {isMaintenanceOn
                                ? '⚠️ La app está en mantenimiento. Los clientes no pueden acceder.'
                                : 'Si activás esto, nadie podrá usar la app temporalmente.'}
                        </p>
                        {isMaintenanceOn && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                    🔴 Modo mantenimiento ACTIVO
                                </p>
                            </div>
                        )}
                        <form action={toggleMaintenance}>
                            <button
                                type="submit"
                                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                                    isMaintenanceOn
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {isMaintenanceOn ? '✅ Desactivar Mantenimiento' : '🔴 Activar Mantenimiento'}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
