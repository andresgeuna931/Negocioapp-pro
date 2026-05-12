import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, ShieldAlert, BellRing } from 'lucide-react';

export default function AdminSettingsPage() {
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

                <Card className="border-red-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            Modo Mantenimiento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 mb-4">
                            Si activás esto, nadie podrá usar la app temporalmente.
                        </p>
                        <button disabled className="px-4 py-2 bg-red-600 text-white rounded-lg opacity-50 cursor-not-allowed">
                            Activar Mantenimiento
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
