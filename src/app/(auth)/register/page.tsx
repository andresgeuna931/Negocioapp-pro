import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-700/50 border border-slate-600/50 flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-slate-400" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Acceso por invitación</h1>
                <p className="text-slate-400 mb-6 leading-relaxed">
                    NegocioApp Pro es una plataforma privada. El acceso se habilita únicamente mediante un link de invitación personalizado.
                </p>

                <p className="text-slate-400 text-sm mb-8">
                    Si ya recibiste tu invitación, usá el link que te enviamos. Si querés conocer la plataforma, contactanos.
                </p>

                <div className="space-y-3">
                    <a
                        href="https://wa.me/5493513000000?text=Hola%2C%20quiero%20conocer%20NegocioApp%20Pro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-12 px-6 inline-flex items-center justify-center rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all"
                    >
                        Contactar por WhatsApp
                    </a>
                    <Link
                        href="/login"
                        className="w-full h-12 px-6 inline-flex items-center justify-center rounded-xl font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all"
                    >
                        Ya tengo cuenta — Iniciar sesión
                    </Link>
                </div>

                <p className="mt-6 text-xs text-slate-600">NegocioApp Pro</p>
            </div>
        </div>
    );
}
