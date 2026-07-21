import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, BellRing } from 'lucide-react';
import { getMaintenanceMode, setMaintenanceMode, getAnnouncement, setAnnouncement } from '@/lib/actions/system-settings';
import { revalidatePath } from 'next/cache';

export default async function AdminSettingsPage() {
    const isMaintenanceOn = await getMaintenanceMode();
    const currentAnnouncement = await getAnnouncement();

    async function toggleMaintenance() {
        'use server';
        await setMaintenanceMode(!isMaintenanceOn);
        revalidatePath('/admin/settings');
    }

    async function saveAnnouncement(formData: FormData) {
        'use server';
        const text = formData.get('announcement') as string;
        await setAnnouncement(text || '');
        revalidatePath('/admin/settings');
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configuración del Sistema</h1>
                <p className="text-slate-500 mt-1">Ajustes globales para NegocioApp Pro</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Anuncio Global */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-purple-500" />
                            Anuncio Global
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Escribí un mensaje que verán todos tus clientes en su dashboard. Dejalo vacío para ocultarlo.
                        </p>
                        <form action={saveAnnouncement} className="space-y-3">
                            <textarea
                                name="announcement"
                                defaultValue={currentAnnouncement}
                                rows={3}
                                maxLength={200}
                                placeholder="ej: El próximo sábado habrá mantenimiento de 2am a 4am."
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400">Máximo 200 caracteres</p>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    {currentAnnouncement ? 'Actualizar anuncio' : 'Publicar anuncio'}
                                </button>
                            </div>
                        </form>
                        {currentAnnouncement && (
                            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Vista previa:</p>
                                <p className="text-sm text-purple-900 dark:text-purple-200">{currentAnnouncement}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modo Mantenimiento */}
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
