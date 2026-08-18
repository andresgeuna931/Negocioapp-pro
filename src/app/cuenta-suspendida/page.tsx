'use client';

import { signOut } from '@/lib/actions/auth';

export default function CuentaSuspendidaPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Cuenta desactivada</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Tu cuenta fue desactivada por el administrador del negocio.
                        Para reactivarla, comunicate con el dueño del negocio.
                    </p>
                </div>

                <form action={signOut}>
                    <button
                        type="submit"
                        className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </form>
            </div>
        </div>
    );
}
