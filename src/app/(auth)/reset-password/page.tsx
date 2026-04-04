'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        // Listen for PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setSessionReady(true);
            }
        });

        // Parse hash from URL and try to set session
        const handleHashToken = async () => {
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                // Parse the hash parameters
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    // Set the session with the tokens from the URL
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (!error) {
                        setSessionReady(true);
                        return;
                    }
                    console.error('Error setting session:', error);
                }

                // Fallback: even with just access_token, try getSession
                // Sometimes Supabase processes the hash automatically
                await new Promise(resolve => setTimeout(resolve, 1500));
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    setSessionReady(true);
                    return;
                }

                // If still no session, mark as error
                setError('El link de recuperación es inválido o expiró.');
            } else {
                // No hash token - check if there's already a session
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    setSessionReady(true);
                } else {
                    setError('No se encontró un link de recuperación válido.');
                }
            }
        };

        handleHashToken();

        return () => subscription.unsubscribe();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });

            if (updateError) {
                setError('Error al actualizar la contraseña. Intentá de nuevo.');
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 2000);
            }
        } catch {
            setError('Error inesperado');
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
                        <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
                        <p className="text-slate-400 mt-1">
                            Ingresá tu nueva contraseña
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium">¡Contraseña actualizada!</p>
                                <p className="text-slate-400 text-sm mt-2">
                                    Redirigiendo al dashboard...
                                </p>
                            </div>
                        </div>
                    ) : !sessionReady ? (
                        <div className="text-center space-y-4">
                            {error ? (
                                <>
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                    <Link href="/forgot-password">
                                        <Button variant="outline" className="w-full mt-2 border-slate-500 text-white bg-slate-700/50 hover:bg-slate-600">
                                            Pedir un nuevo link
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-700 animate-pulse" />
                                    <p className="text-slate-400 text-sm">
                                        Verificando link de recuperación...
                                    </p>
                                    <p className="text-slate-500 text-xs">
                                        Si tarda mucho, el link puede haber expirado.{' '}
                                        <Link href="/forgot-password" className="text-emerald-400 hover:underline">
                                            Pedí uno nuevo
                                        </Link>
                                    </p>
                                </>
                            )}
                        </div>

                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    label="Nueva contraseña"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={<Lock className="w-5 h-5" />}
                                    required
                                    className="bg-slate-800/50 border-slate-700 text-white pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-[38px] text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <Input
                                type={showPassword ? 'text' : 'password'}
                                label="Confirmar contraseña"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                icon={<Lock className="w-5 h-5" />}
                                required
                                className="bg-slate-800/50 border-slate-700 text-white"
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                loading={loading}
                            >
                                Guardar nueva contraseña
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
