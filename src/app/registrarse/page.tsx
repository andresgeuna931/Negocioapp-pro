"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_TYPES } from "@/lib/constants/business-types";

type BillingCycle = "monthly" | "annual";

const PLANS_DISPLAY = [
    {
        id: "starter",
        annualId: null, // No tiene versión anual
        name: "Starter",
        description: "Ideal para kioscos pequeños que recién empiezan.",
        features: ["Hasta 1.000 productos", "Múltiples listas de precios", "Control de caja", "Reportes básicos"],
    },
    {
        id: "professional",
        annualId: "professional_annual",
        name: "Profesional",
        description: "Para negocios en crecimiento que necesitan gestión de clientes.",
        features: ["Hasta 5.000 productos", "2 empleados", "Cuenta corriente", "Soporte VIP por Telegram", "Exportación Excel"],
        recommended: true,
    },
    {
        id: "business",
        annualId: "business_annual",
        name: "Business",
        description: "Gestión total sin límites para comercios establecidos.",
        features: ["Productos ilimitados", "5 empleados", "Todas las funciones", "Soporte VIP por Telegram"],
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
        const planId = billing === "annual" && plan.annualId ? plan.annualId : plan.id;
        setSelectedPlanId(planId);
        setStep("form");
    }

    function getSelectedPlanName(): string {
        for (const p of PLANS_DISPLAY) {
            if (p.id === selectedPlanId) return `${p.name} (mensual)`;
            if (p.annualId === selectedPlanId) return `${p.name} (anual)`;
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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900">NegocioApp Pro</h1>
                <p className="text-gray-500 mt-1">Creá tu cuenta y empezá hoy</p>
            </div>

            {step === "plan" && (
                <div className="w-full max-w-4xl">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Elegí tu plan</h2>

                    {/* Toggle mensual / anual */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <span className={`text-sm font-medium ${billing === "monthly" ? "text-gray-900" : "text-gray-400"}`}>
                            Mensual
                        </span>
                        <button
                            type="button"
                            onClick={() => setBilling(prev => prev === "monthly" ? "annual" : "monthly")}
                            className={`relative w-12 h-6 rounded-full transition-colors ${billing === "annual" ? "bg-blue-600" : "bg-gray-300"}`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === "annual" ? "translate-x-6" : "translate-x-0"}`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${billing === "annual" ? "text-gray-900" : "text-gray-400"}`}>
                            Anual
                        </span>
                        {billing === "annual" && (
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                Ahorrás 2 meses
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS_DISPLAY.map((plan) => {
                            const isAnnual = billing === "annual" && plan.annualId;
                            return (
                                <button
                                    key={plan.id}
                                    onClick={() => selectPlan(plan)}
                                    className={`relative text-left rounded-2xl border-2 p-6 transition-all hover:shadow-lg cursor-pointer bg-white ${
                                        plan.recommended
                                            ? "border-blue-500 shadow-md"
                                            : "border-gray-200 hover:border-blue-300"
                                    }`}
                                >
                                    {plan.recommended && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                                            Más elegido
                                        </span>
                                    )}
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                        {isAnnual && (
                                            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full ml-2 mt-0.5">
                                                Anual
                                            </span>
                                        )}
                                        {!isAnnual && plan.annualId && (
                                            <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full ml-2 mt-0.5">
                                                Mensual
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                    <ul className="space-y-1">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                                                <span className="text-green-500">✓</span> {f}
                                            </li>
                                        ))}
                                    </ul>
                                    {isAnnual && !plan.annualId && (
                                        <p className="mt-3 text-xs text-gray-400 italic">Solo disponible en mensual</p>
                                    )}
                                    <div className="mt-6">
                                        <span className="inline-block w-full text-center bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-blue-700 transition-colors">
                                            Elegir {plan.name} →
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {billing === "annual" && (
                        <p className="text-center text-xs text-gray-400 mt-4">
                            * Starter solo disponible en modalidad mensual.
                        </p>
                    )}

                    <p className="text-center text-sm text-gray-500 mt-6">
                        ¿Ya tenés cuenta?{" "}
                        <a href="/login" className="text-blue-600 hover:underline font-medium">
                            Iniciá sesión
                        </a>
                    </p>
                </div>
            )}

            {step === "form" && (
                <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-200 p-8">
                    <button
                        onClick={() => setStep("plan")}
                        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
                    >
                        ← Volver
                    </button>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">Datos de tu cuenta</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Plan seleccionado:{" "}
                        <span className="font-semibold text-blue-600">{getSelectedPlanName()}</span>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre completo</label>
                            <input
                                name="fullName"
                                type="text"
                                required
                                value={form.fullName}
                                onChange={handleChange}
                                placeholder="Juan García"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
                            <input
                                name="businessName"
                                type="text"
                                required
                                value={form.businessName}
                                onChange={handleChange}
                                placeholder="Kiosco El Sol"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negocio</label>
                            <select
                                name="businessType"
                                value={form.businessType}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {BUSINESS_TYPES.map((bt) => (
                                    <option key={bt.value} value={bt.value}>
                                        {bt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="juan@ejemplo.com"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input
                                name="password"
                                type="password"
                                required
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                required
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Repetí tu contraseña"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Código de referido{" "}
                                <span className="text-gray-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                name="referralCode"
                                type="text"
                                value={form.referralCode}
                                onChange={handleChange}
                                placeholder="ej: ABC123"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                        >
                            {loading ? "Creando tu cuenta..." : "Crear cuenta y pagar →"}
                        </button>

                        <p className="text-center text-xs text-gray-400 mt-2">
                            Al continuar aceptás los{" "}
                            <a href="/terminos" className="underline hover:text-gray-600">términos de uso</a>{" "}
                            y la{" "}
                            <a href="/privacidad" className="underline hover:text-gray-600">política de privacidad</a>.
                        </p>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        ¿Ya tenés cuenta?{" "}
                        <a href="/login" className="text-blue-600 hover:underline font-medium">
                            Iniciá sesión
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
}
