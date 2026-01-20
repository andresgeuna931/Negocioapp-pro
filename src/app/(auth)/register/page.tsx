'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Store, Mail, Lock, Eye, EyeOff, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { signUp } from '@/lib/actions/auth';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/constants/business-types';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        businessType: 'kiosco' as BusinessType,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validations
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const result = await signUp({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                businessName: formData.businessName,
                businessType: formData.businessType,
            });

            if (result.error) {
                setError(result.error);
            } else {
                router.push(redirect);
                router.refresh();
            }
        } catch {
            setError('Error al crear la cuenta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card variant="glass" className="w-full max-w-md relative">
            <CardContent className="p-8">
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                        <Store className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">NegocioApp Pro</h1>
                    <p className="text-slate-400 mt-1">Creá tu cuenta gratis</p>
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

                    <div className="border-t border-slate-700 my-4 pt-4">
                        <p className="text-sm text-slate-400 mb-3">Datos de tu negocio</p>
                    </div>

                    <Input
                        type="text"
                        name="businessName"
                        label="Nombre del negocio"
                        placeholder="Mi Kiosco"
                        value={formData.businessName}
                        onChange={handleChange}
                        icon={<Building2 className="w-5 h-5" />}
                        required
                        className="bg-slate-800/50 border-slate-700 text-white"
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Tipo de negocio
                        </label>
                        <select
                            name="businessType"
                            value={formData.businessType}
                            onChange={handleChange}
                            className="w-full h-12 px-4 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                            required
                        >
                            {BUSINESS_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button
                        type="submit"
                        className="w-full mt-6"
                        size="lg"
                        loading={loading}
                    >
                        Crear cuenta gratis
                    </Button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-slate-500">
                    ¿Ya tenés cuenta?{' '}
                    <Link href="/login" className="text-emerald-400 hover:underline">
                        Iniciá sesión
                    </Link>
                </div>

                {/* Trial info */}
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-emerald-400 text-sm">
                        🎉 30 días de prueba gratis, sin tarjeta de crédito
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <Suspense fallback={
                <div className="w-full max-w-md h-[600px] rounded-2xl bg-slate-800/50 animate-pulse" />
            }>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
