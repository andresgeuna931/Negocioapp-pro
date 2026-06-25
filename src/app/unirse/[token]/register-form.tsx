'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Mail, Lock, Eye, EyeOff, User, CheckCircle2, Shield, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/config/plans';
import { BUSINESS_TYPES } from '@/lib/constants/business-types';

interface RegisterFormProps {
    token: string;
    plan: any;
    invitation: any;
}

export function RegisterForm({ token, plan, invitation }: RegisterFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        email: '',
        password: '',
        confirmPassword: '',
        businessType: 'kiosco',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const isAnual = plan.billing === 'annual';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
            // 1. Crear cuenta y tenant
            const regRes = await fetch('/api/register-invited', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    email: cleanEmail,
                    password: formData.password,
                    fullName: formData.fullName,
                    businessName: formData.businessName,
                    planId: plan.id,
                    businessType: formData.businessType,
                }),
            });

            const regData = await regRes.json();
            if (!regRes.ok) {
                setError(regData.error || 'Error al crear la cuenta');
                setLoading(false);
                return;
            }

            // 2. Ir al checkout de MP
            const checkoutRes = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id }),
            });

            const checkoutData = await checkoutRes.json();
            if (!checkoutRes.ok) {
                setError(checkoutData.error || 'Error al iniciar el pago');
                setLoading(false);
                return;
            }

            // 3. Redirigir a MP — botón queda bloqueado intencionalmente hasta que carga MP
            window.location.href = checkoutData.init_point;

        } catch {
            setError('Error inesperado. Intentá de nuevo.');
            setLoading(false);
        }
        // Sin finally — el botón no se libera si la redirección fue exitosa
    };

    return (
        <div className="w-full max-w-lg relative space-y-4">

            {/* Header del plan */}
            <Card variant="glass" className="w-full">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                            <Store className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-400 text-sm">Tu plan seleccionado</p>
                            <h2 className="text-white font-bold text-xl">{plan.name}</h2>
                            <p className="text-slate-400 text-sm">{plan.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-2xl font-bold text-white">{formatPrice(plan.price)}</p>
                            <p className="text-slate-400 text-xs">{isAnual ? '/año' : '/mes'}</p>
                        </div>
                    </div>

                    {/* Info de cobro */}
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                        {isAnual ? (
                            <>
                                <div className="flex items-center gap-2 text-sm text-emerald-400">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Ahorrás {formatPrice(plan.savings)} — 2 meses gratis</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Shield className="w-4 h-4" />
                                    <span>Precio fijo por 12 meses — sin aumentos</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>1 solo cobro anual de {formatPrice(plan.price)}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-sm text-amber-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        Hoy pagás {formatPrice(plan.price)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Shield className="w-4 h-4" />
                                    <span>Se renueva automáticamente cada mes por {formatPrice(plan.price)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Formulario de registro */}
            <Card variant="glass" className="w-full">
                <CardContent className="p-8">
                    <h1 className="text-2xl font-bold text-white mb-1">Creá tu cuenta</h1>
                    <p className="text-slate-400 text-sm mb-6">Completá tus datos y luego pasás al pago</p>

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
                            type="text"
                            name="businessName"
                            label="Nombre de tu negocio"
                            placeholder="Kiosco El Barrio"
                            value={formData.businessName}
                            onChange={handleChange}
                            icon={<Store className="w-5 h-5" />}
                            required
                            className="bg-slate-800/50 border-slate-700 text-white"
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-300">
                                Tipo de negocio
                            </label>
                            <select
                                name="businessType"
                                value={formData.businessType}
                                onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                                className="w-full h-11 bg-slate-800/50 border border-slate-700 text-white rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {BUSINESS_TYPES.map((type) => (
                                    <option key={type.value} value={type.value} className="bg-slate-800">
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : `Crear cuenta e ir al pago →`}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        ¿Ya tenés cuenta?{' '}
                        <Link href="/login" className="text-emerald-400 hover:underline">
                            Iniciá sesión
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
