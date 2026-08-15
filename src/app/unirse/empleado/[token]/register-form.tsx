'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, Eye, EyeOff, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { joinAsEmployee } from '@/lib/actions/team';
import { createClient } from '@/lib/supabase/client';

interface Props {
    token: string;
    businessName: string;
}

export function EmployeeRegisterForm({ token, businessName }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
            setError('Completá todos los campos.');
            return;
        }
        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        const result = await joinAsEmployee({ token, ...formData });

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        // Iniciar sesión automáticamente
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
        });

        if (signInError) {
            // Registro OK pero login falló — redirigir al login manual
            router.push('/login');
            return;
        }

        setSuccess(true);
        setTimeout(() => router.push('/'), 1500);
    };

    if (success) {
        return (
            <Card variant="glass" className="w-full max-w-md relative">
                <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">¡Cuenta creada!</h2>
                    <p className="text-slate-400">Entrando a {businessName}...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass" className="w-full max-w-md relative">
            <CardContent className="p-8">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3">
                        <Store className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Unirte a {businessName}</h1>
                    <p className="text-slate-400 text-sm mt-1">Creá tu cuenta para acceder al negocio</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre completo"
                        leftIcon={<User className="w-4 h-4" />}
                        placeholder="Tu nombre"
                        value={formData.fullName}
                        onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                        disabled={loading}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        leftIcon={<Mail className="w-4 h-4" />}
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        disabled={loading}
                        required
                    />
                    <Input
                        label="Contraseña"
                        type={showPassword ? 'text' : 'password'}
                        leftIcon={<Lock className="w-4 h-4" />}
                        rightIcon={
                            <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        }
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                        disabled={loading}
                        required
                    />

                    {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Creando cuenta...' : 'Crear cuenta y entrar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
