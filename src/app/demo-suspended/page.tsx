import { PauseCircle } from 'lucide-react';

export default function DemoSuspendedPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <PauseCircle className="w-10 h-10 text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">
                    Cuenta suspendida temporalmente
                </h1>
                <p className="text-slate-400 leading-relaxed">
                    Esta cuenta de demostración está pausada en este momento. Intentá de nuevo más tarde.
                </p>
                <div className="mt-8 pt-6 border-t border-slate-800">
                    <p className="text-xs text-slate-600">NegocioApp Pro</p>
                </div>
            </div>
        </div>
    );
}
