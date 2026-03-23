'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Mail, Lock, Eye, EyeOff, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { joinTeamViaInvite } from '@/lib/actions/team';

interface JoinFormProps {
    token: string;
    businessName: string;
    role: string;
}

export function JoinForm({ token, businessName, role }: JoinFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const cleanEmail = formData.email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setError('Formato de email inválido');
            return;
        }

        setLoading(true);

        try {
            const result = await joinTeamViaInvite({
                token,
                email: cleanEmail,
                password: formData.password,
                fullName: formData.fullName,
            });

            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 2000);
            }
        } catch {
            setError('Error al crear la cuenta');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Card variant="glass" className="w-full max-w-md">
                <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">¡Bienvenido al equipo!</h2>
                    <p className="text-slate-400">
                        Te uniste a <strong className="text-white">{businessName}</strong>. Redirigiendo...
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass" className="w-full max-w-md relative">
            <CardContent className="p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Unirte al equipo</h1>
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-emerald-400 text-sm">
                            Te invitaron a unirte a
                        </p>
                        <p className="text-white font-bold text-lg mt-1">{businessName}</p>
                        <p className="text-slate-400 text-xs mt-1">
                            Rol: {role === 'staff' ? '👤 Empleado' : role === 'admin' ? '🛡️ Admin' : '🏪 Dueño'}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <Input
                        type="text"
                        name="fullName"
                        label="Tu nombre completo"
                        placeholder="Juan Pérez"
                        value={formData.fullName}
                        onChange={handleChange}
                        icon={<User className="w-5 h-5" />}
                        required
                        className="bg-slate-800/50 border-slate-700 text-white"
                    />

                    <Input
                        type="email"
                        name="email"
                        label="Email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        icon={<Mail className="w-5 h-5" />}
                        required
                        className="bg-slate-800/50 border-slate-700 text-white"
                    />

                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            label="Contraseña"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
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
                        name="confirmPassword"
                        label="Confirmar contraseña"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        icon={<Lock className="w-5 h-5" />}
                        required
                        className="bg-slate-800/50 border-slate-700 text-white"
                    />

                    <Button
                        type="submit"
                        className="w-full mt-6"
                        size="lg"
                        loading={loading}
                    >
                        Unirme al equipo
                    </Button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-slate-500">
                    ¿Ya tenés cuenta?{' '}
                    <Link href="/login" className="text-emerald-400 hover:underline">
                        Iniciá sesión
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
