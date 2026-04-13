'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setError('Ingresá un email válido');
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
            } else {
                setSent(true);
            }
        } catch {
            setError('Error inesperado. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <Card variant="glass" className="w-full max-w-md relative">
                <CardContent className="p-8">
                    {/* Logo */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                            <ShoppingCart className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
                        <p className="text-slate-400 mt-1">
                            Te enviaremos un email para restablecer tu contraseña
                        </p>
                    </div>

                    {sent ? (
                        /* Success state */
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium">¡Email enviado!</p>
                                <p className="text-slate-400 text-sm mt-2">
                                    Revisá tu bandeja de entrada en <strong className="text-white">{email}</strong>.
                                    Si no lo ves, revisá la carpeta de spam.
                                </p>
                            </div>
                            <Link href="/login">
                                <Button variant="outline" className="w-full mt-4 border-slate-500 text-white bg-slate-700/50 hover:bg-slate-600">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Volver a iniciar sesión
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        /* Form */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <Input
                                type="email"
                                label="Email de tu cuenta"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={<Mail className="w-5 h-5" />}
                                required
                                className="bg-slate-800/50 border-slate-700 text-white"
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                loading={loading}
                            >
                                Enviar email de recuperación
                            </Button>
                        </form>
                    )}

                    {/* Back to login */}
                    {!sent && (
                        <div className="mt-6 text-center text-sm text-slate-500">
                            <Link href="/login" className="text-emerald-400 hover:underline flex items-center justify-center gap-1">
                                <ArrowLeft className="w-4 h-4" />
                                Volver a iniciar sesión
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
