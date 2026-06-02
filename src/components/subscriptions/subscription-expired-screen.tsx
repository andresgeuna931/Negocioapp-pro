'use client';

import { AlertCircle, MessageCircle, RefreshCw } from 'lucide-react';

interface SubscriptionExpiredScreenProps {
    tenantName?: string;
}

export function SubscriptionExpiredScreen({ tenantName }: SubscriptionExpiredScreenProps) {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Ícono */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                </div>

                {/* Título */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Tu suscripción venció
                    </h1>
                    {tenantName && (
                        <p className="text-slate-500 dark:text-slate-400">
                            {tenantName}
                        </p>
                    )}
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        Para seguir usando NegocioApp Pro y acceder a tus ventas, productos e inventario, necesitás renovar tu suscripción.
                    </p>
                </div>

                {/* Info */}
                <div className="bg-slate-800/50 rounded-xl p-4 text-left space-y-2">
                    <p className="text-sm text-slate-400">
                        ✅ Tus datos están seguros y guardados
                    </p>
                    <p className="text-sm text-slate-400">
                        ✅ Nada se borra al vencer la suscripción
                    </p>
                    <p className="text-sm text-slate-400">
                        ✅ Al renovar, recuperás acceso inmediato
                    </p>
                </div>

                {/* Botones */}
                <div className="space-y-3">
                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined' && (window as any).Tawk_API) {
                                (window as any).Tawk_API.maximize();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Contactar para renovar
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-6 rounded-xl transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Ya pagué, actualizar
                    </button>
                </div>

                {/* Email alternativo */}
                <p className="text-xs text-slate-500">
                    También podés escribirnos a{' '}
                    
                        href="mailto:amgdigital.ok@gmail.com"
                        className="text-emerald-400 hover:underline"
                    >
                        amgdigital.ok@gmail.com
                    </a>
                </p>
            </div>
        </div>
    );
}
