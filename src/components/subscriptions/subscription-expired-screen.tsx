'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface SubscriptionExpiredScreenProps {
    tenantName?: string;
}

type UIState =
    | 'expired'       // pantalla principal de vencimiento
    | 'loading'       // generando checkout (botón deshabilitado)
    | 'processing'    // pago enviado, polling esperando webhook
    | 'failed'        // pago rechazado por MP
    | 'error';        // error interno al generar el checkout

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120000; // 2 minutos máximo

export function SubscriptionExpiredScreen({ tenantName }: SubscriptionExpiredScreenProps) {
    // Detectar si volvemos de MP con un query param
    const getInitialState = (): UIState => {
        if (typeof window === 'undefined') return 'expired';
        const params = new URLSearchParams(window.location.search);
        const renewal = params.get('renewal');
        const status = params.get('status');
        // MP a veces agrega ?collection_status=approved/rejected o simplemente vuelve sin param
        const collectionStatus = params.get('collection_status');

        if (renewal === '1') {
            if (collectionStatus === 'rejected' || status === 'failure') return 'failed';
            // Si no vino con rechazo explícito, asumimos que viene del pago y esperamos webhook
            return 'processing';
        }
        return 'expired';
    };

    const [uiState, setUiState] = useState<UIState>('expired');
    const [pollExpired, setPollExpired] = useState(false); // polling timeout

    // Inicializar estado desde la URL (solo en el cliente)
    useEffect(() => {
        setUiState(getInitialState());
    }, []);

    // --- Polling ---
    const startPolling = useCallback(() => {
        const start = Date.now();
        let timer: ReturnType<typeof setTimeout>;

        const poll = async () => {
            if (Date.now() - start > POLL_TIMEOUT_MS) {
                setPollExpired(true);
                return;
            }
            try {
                const res = await fetch('/api/subscription-status');
                const data = await res.json();
                if (data.active) {
                    // Limpiar query params y recargar el dashboard
                    window.location.href = '/dashboard';
                    return;
                }
            } catch {
                // silencioso — reintentamos en el próximo ciclo
            }
            timer = setTimeout(poll, POLL_INTERVAL_MS);
        };

        poll();
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (uiState === 'processing') {
            const cleanup = startPolling();
            return cleanup;
        }
    }, [uiState, startPolling]);

    // --- Handler del botón renovar ---
    const handleRenovar = async () => {
        setUiState('loading');
        try {
            const res = await fetch('/api/checkout-renewal', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.init_point) {
                console.error('checkout-renewal error:', data);
                setUiState('error');
                return;
            }
            window.location.href = data.init_point;
        } catch (err) {
            console.error('checkout-renewal fetch failed:', err);
            setUiState('error');
        }
    };

    // ----------------------------------------------------------------
    // RENDER — pantalla procesando
    // ----------------------------------------------------------------
    if (uiState === 'processing') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">

                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Procesando tu pago…
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                            Confirmamos el pago con MercadoPago. Esto suele tardar unos segundos.
                            No cierres esta pestaña.
                        </p>
                    </div>

                    {pollExpired ? (
                        <div className="space-y-4">
                            <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
                                <p className="text-amber-300 text-sm">
                                    La confirmación está tardando más de lo esperado. Si ya se debitó el pago,
                                    tu acceso se activará automáticamente en breve.
                                </p>
                            </div>
                            <p className="text-xs text-slate-500">
                                ¿Seguís sin acceso?{' '}
                                <a href="mailto:amgdigital.ok@gmail.com" className="text-emerald-400 hover:underline">
                                    Contactanos
                                </a>
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-6 rounded-xl transition-colors text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Verificar manualmente
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center gap-2 pt-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------
    // RENDER — pago fallido
    // ----------------------------------------------------------------
    if (uiState === 'failed') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">

                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            El pago no fue procesado
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                            MercadoPago rechazó el pago. No se realizó ningún cobro.
                            Podés intentarlo de nuevo.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleRenovar}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Intentar de nuevo
                        </button>
                    </div>

                    <p className="text-xs text-slate-500">
                        ¿Problemas con el pago?{' '}
                        <a href="mailto:amgdigital.ok@gmail.com" className="text-emerald-400 hover:underline">
                            Contactanos
                        </a>
                    </p>

                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------
    // RENDER — pantalla principal (expired / loading / error)
    // ----------------------------------------------------------------
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">

                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                </div>

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
                        Para seguir usando NegocioApp Pro y acceder a tus ventas, productos
                        e inventario, necesitás renovar tu suscripción.
                    </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 text-left space-y-2">
                    <p className="text-sm text-slate-400">✅ Tus datos están seguros y guardados</p>
                    <p className="text-sm text-slate-400">✅ Nada se borra al vencer la suscripción</p>
                    <p className="text-sm text-slate-400">✅ Al renovar, recuperás acceso inmediato</p>
                </div>

                {uiState === 'error' && (
                    <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
                        <p className="text-red-300 text-sm">
                            Hubo un error al generar el checkout. Intentá de nuevo o contactanos.
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleRenovar}
                        disabled={uiState === 'loading'}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        {uiState === 'loading' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generando checkout…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Renovar plan
                            </>
                        )}
                    </button>
                </div>

                <p className="text-xs text-slate-500">
                    También podés escribirnos a{' '}
                    <a href="mailto:amgdigital.ok@gmail.com" className="text-emerald-400 hover:underline">
                        amgdigital.ok@gmail.com
                    </a>
                </p>

            </div>
        </div>
    );
}
