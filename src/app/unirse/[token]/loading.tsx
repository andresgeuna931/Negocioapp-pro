export default function JoinPageLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Mismo fondo decorativo que la página real */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl p-8 space-y-6 animate-pulse">
                    {/* Ícono */}
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-700/60" />
                    </div>
                    {/* Título */}
                    <div className="space-y-2 text-center">
                        <div className="h-6 bg-slate-700/60 rounded-lg w-48 mx-auto" />
                        <div className="h-4 bg-slate-700/40 rounded-lg w-32 mx-auto" />
                    </div>
                    {/* Campos del formulario */}
                    <div className="space-y-3">
                        <div className="h-12 bg-slate-700/40 rounded-xl" />
                        <div className="h-12 bg-slate-700/40 rounded-xl" />
                        <div className="h-12 bg-slate-700/40 rounded-xl" />
                        <div className="h-12 bg-slate-700/40 rounded-xl" />
                    </div>
                    {/* Botón */}
                    <div className="h-12 bg-emerald-600/30 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
