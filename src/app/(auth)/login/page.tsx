'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { signIn } from '@/lib/actions/auth';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn(email, password);

            if (result.error) {
                setError(result.error);
            } else {
                router.push(redirect);
                router.refresh();
            }
        } catch {
            setError('Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card variant="glass" className="w-full max-w-md relative">
            <CardContent className="p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                        <ShoppingCart className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">NegocioApp Pro</h1>
                    <p className="text-slate-400 mt-1">Iniciá sesión para continuar</p>
                </div>

                {/* Form */}
                <form 
                    onSubmit={handleSubmit} 
                    className="space-y-5"
                    autoComplete="off"
                >
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <Input
                        type="email"
                        label="Email"
                        placeholder="tu@email.com"
                        name="negocio_user_mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail className="w-5 h-5" />}
                        required
                        className="bg-slate-800/50 border-slate-700 text-white"
                    />

                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            label="Contraseña"
                            placeholder="••••••••"
                            name="negocio_user_pass"
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

                    <Button
                        type="submit"
                        id="btn-login-submit"
                        className="w-full"
                        size="lg"
                        loading={loading}
                    >
                        Iniciar Sesión
                    </Button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-slate-500">
                    <a href="/forgot-password" className="text-emerald-400 hover:underline">
                        ¿Olvidaste tu contraseña?
                    </a>
                </div>

                {/* Register link */}
                <div className="mt-4 text-center text-sm text-slate-400">
                    ¿No tenés cuenta?{' '}
                    <a href="/register" className="text-emerald-400 hover:underline font-medium">
                        Registrate gratis
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <Suspense fallback={
                <div className="w-full max-w-md h-96 rounded-2xl bg-slate-800/50 animate-pulse" />
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}

