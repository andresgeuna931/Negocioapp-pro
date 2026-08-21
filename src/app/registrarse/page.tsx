"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_TYPES } from "@/lib/constants/business-types";

type BillingCycle = "monthly" | "annual";

const PLANS_DISPLAY = [
    {
        id: "starter",
        annualId: null,
        name: "Starter",
        description: "Ideal para kioscos pequeños que recién empiezan.",
        features: [
            "Hasta 1.000 productos",
            "Múltiples listas de precios",
            "Control de caja",
            "Reportes básicos",
            "Actualización masiva de precios",
        ],
        recommended: false,
    },
    {
        id: "professional",
        annualId: "professional_annual",
        name: "Profesional",
        description: "Para negocios en crecimiento que necesitan gestión de clientes.",
        features: [
            "Hasta 5.000 productos",
            "2 empleados",
            "Cuenta corriente de clientes",
            "Soporte VIP por Telegram",
            "Exportación a Excel",
            "Actualización masiva de precios",
            "Reportes avanzados",
        ],
        recommended: true,
    },
    {
        id: "business",
        annualId: "business_annual",
        name: "Business",
        description: "Gestión total sin límites para comercios establecidos.",
        features: [
            "Productos ilimitados",
            "5 empleados",
            "Cuenta corriente de clientes",
            "Soporte VIP por Telegram",
            "Exportación a Excel",
            "Actualización masiva de precios",
            "Reportes avanzados",
            "Prioridad máxima de soporte",
        ],
        recommended: false,
    },
];

export default function RegistrarsePage() {
    const router = useRouter();
    const [step, setStep] = useState<"plan" | "form">("plan");
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");
    const [billing, setBilling] = useState<BillingCycle>("monthly");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        businessType: "kiosco",
        referralCode: "",
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function selectPlan(plan: typeof PLANS_DISPLAY[0]) {
        if (billing === "annual" && !plan.annualId) return; // Starter no disponible en anual
        const planId = billing === "annual" && plan.annualId ? plan.annualId : plan.id;
        setSelectedPlanId(planId);
        setStep("form");
    }

    function getSelectedPlanName(): string {
        for (const p of PLANS_DISPLAY) {
            if (p.id === selectedPlanId) return `${p.name} — mensual`;
            if (p.annualId === selectedPlanId) return `${p.name} — anual`;
        }
        return selectedPlanId;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (form.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/register-self", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    fullName: form.fullName,
                    businessName: form.businessName,
                    businessType: form.businessType,
                    planId: selectedPlanId,
                    referralCode: form.referralCode || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Ocurrió un error. Intentá de nuevo.");
                return;
            }

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                router.push("/login?registro=ok");
            }
        } catch {
            setError("Error de conexión. Revisá tu internet e intentá de nuevo.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-12 relative">
            {/* Decoración de fondo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="mb-8 text-center relative z-10">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                    <span className="text-3xl font-bold text-white">N</span>
                </div>
                <h1 className="text-3xl font-bold text-white">
                    NegocioApp <span className="text-emerald-400">Pro</span>
                </h1>
                <p className="text-slate-400 mt-1">Creá tu cuenta y empezá hoy</p>
            </div>

            {/* STEP 1 — ELEGIR PLAN */}
            {step === "plan" && (
                <div className="w-full max-w-4xl relative z-10">
                    <h2 className="text-xl font-semibold text-white mb-4 text-center">Elegí tu plan</h2>

                    {/* Toggle mensual / anual */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <span className={`text-sm font-medium ${billing === "monthly" ? "text-white" : "text-slate-400"}`}>
                            Mensual
                        </span>
                        <button
                            type="button"
                            onClick={() => setBilling(prev => prev === "monthly" ? "annual" : "monthly")}
                            className={`relative w-12 h-6 rounded-full transition-colors ${billing === "annual" ? "bg-emerald-500" : "bg-slate-600"}`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === "annual" ? "translate-x-6" : "translate-x-0"}`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${billing === "annual" ? "text-white" : "text-slate-400"}`}>
                            Anual
                        </span>
                        {billing === "annual" && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Ahorrás 2 meses
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS_DISPLAY.map((plan) => {
                            const isAnnual = billing === "annual";
                            const unavailable = isAnnual && !plan.annualId;

                            return (
                                <button
                                    key={plan.id}
                                    onClick={() => selectPlan(plan)}
                                    disabled={unavailable}
                                    className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                                        unavailable
                                            ? "border-slate-700 bg-slate-800/30 opacity-40 cursor-not-allowed"
                                            : plan.recommended
                                                ? "border-emerald-500 bg-slate-800/80 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:shadow-xl cursor-pointer"
                                                : "border-slate-700 bg-slate-800/60 hover:border-emerald-500/50 hover:bg-slate-800/80 cursor-pointer"
                                    }`}
                                >
                                    {plan.recommended && !unavailable && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                                            Más elegido
                                        </span>
                                    )}

                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className={`text-lg font-bold ${unavailable ? "text-slate-500" : "text-white"}`}>
                                            {plan.name}
                                        </h3>
                                        {!unavailable && isAnnual && plan.annualId && (
                                            <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 ml-2 mt-0.5">
                                                Anual
                                            </span>
                                        )}
                                        {!isAnnual && plan.annualId && (
                                            <span className="text-xs bg-slate-700 text-slate-400 font-medium px-2 py-0.5 rounded-full ml-2 mt-0.5">
                                                Mensual
                                            </span>
                                        )}
                                        {unavailable && (
                                            <span className="text-xs bg-slate-700 text-slate-500 font-medium px-2 py-0.5 rounded-full ml-2 mt-0.5">
                                                Solo mensual
                                            </span>
                                        )}
                                    </div>

                                    <p className={`text-sm mb-4 ${unavailable ? "text-slate-600" : "text-slate-400"}`}>
                                        {plan.description}
                                    </p>

                                    <ul className="space-y-1.5">
                                        {plan.features.map((f) => (
                                            <li key={f} className={`flex items-center gap-2 text-sm ${unavailable ? "text-slate-600" : "text-slate-300"}`}>
                                                <span className={unavailable ? "text-slate-600" : "text-emerald-400"}>✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {!unavailable && (
                                        <div className="mt-6">
                                            <span className={`inline-block w-full text-center font-semibold py-2.5 rounded-xl text-sm transition-colors ${
                                                plan.recommended
                                                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                                                    : "bg-slate-700 text-white hover:bg-slate-600"
                                            }`}>
                                                Elegir {plan.name} →
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* STEP 2 — FORMULARIO */}
            {step === "form" && (
                <div className="w-full max-w-md relative z-10">
                    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700 p-8">
                        <button
                            onClick={() => setStep("plan")}
                            className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors"
                        >
                            ← Volver a planes
                        </button>
                        <h2 className="text-xl font-semibold text-white mb-1">Datos de tu cuenta</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Plan:{" "}
                            <span className="font-semibold text-emerald-400">{getSelectedPlanName()}</span>
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tu nombre completo</label>
                                <input
                                    name="fullName"
                                    type="text"
                                    required
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="Juan García"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del negocio</label>
                                <input
                                    name="businessName"
                                    type="text"
                                    required
                                    value={form.businessName}
                                    onChange={handleChange}
                                    placeholder="Kiosco El Sol"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de negocio</label>
                                <select
                                    name="businessType"
                                    value={form.businessType}
                                    onChange={handleChange}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    {BUSINESS_TYPES.map((bt) => (
                                        <option key={bt.value} value={bt.value}>
                                            {bt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="juan@ejemplo.com"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Repetir contraseña</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Repetí tu contraseña"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Código de referido{" "}
                                    <span className="text-slate-500 font-normal">(opcional)</span>
                                </label>
                                <input
                                    name="referralCode"
                                    type="text"
                                    value={form.referralCode}
                                    onChange={handleChange}
                                    placeholder="ej: ABC123"
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-emerald-500/20"
                            >
                                {loading ? "Creando tu cuenta..." : "Crear cuenta y pagar →"}
                            </button>

                            <p className="text-center text-xs text-slate-500 mt-2">
                                Al continuar aceptás los{" "}
                                <a href="/terminos" className="underline hover:text-slate-300 transition-colors">términos de uso</a>{" "}
                                y la{" "}
                                <a href="/privacidad" className="underline hover:text-slate-300 transition-colors">política de privacidad</a>.
                            </p>
                        </form>

                        <p className="text-center text-sm text-slate-500 mt-6">
                            ¿Ya tenés cuenta?{" "}
                            <a href="/login" className="text-emerald-400 hover:underline font-medium transition-colors">
                                Iniciá sesión
                            </a>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
