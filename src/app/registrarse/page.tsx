"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Info } from "lucide-react";
import { BUSINESS_TYPES } from "@/lib/constants/business-types";
import { PLANS, formatPrice } from "@/lib/config/plans";

// ─── tipos ────────────────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "annual";

// ─── FeatureRow (igual que pricing-card) ─────────────────────────────────────
function FeatureRow({
    included,
    text,
    tooltip,
    highlight = false,
}: {
    included: boolean;
    text: string;
    tooltip?: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            {included ? (
                <Check className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-emerald-400" : "text-emerald-500"}`} />
            ) : (
                <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
            )}
            <div className="flex items-center gap-1">
                <span
                    className={
                        included
                            ? highlight
                                ? "text-white font-semibold text-sm"
                                : "text-slate-200 text-sm"
                            : "text-slate-600 line-through text-sm"
                    }
                    title={tooltip}
                >
                    {text}
                </span>
                {tooltip && (
                    <span title={tooltip} className="cursor-help flex items-center">
                        <Info className="w-3 h-3 text-slate-500" />
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────
function PlanCard({
    planKey,
    onSelect,
    disabled = false,
}: {
    planKey: keyof typeof PLANS;
    onSelect: (planId: string) => void;
    disabled?: boolean;
}) {
    const plan = PLANS[planKey] as any;
    const isPro = plan.id === "professional";
    const isAnnual = plan.id.endsWith("_annual");
    const isVIP = plan.id !== "starter";

    const supportText = plan.id === "starter"
        ? "Chat en vivo Tawk.to (Autogestión)"
        : "Soporte VIP Telegram 24/7";

    return (
        <div
            className={`relative flex flex-col h-full rounded-2xl border transition-all duration-300 overflow-hidden
                ${disabled
                    ? "border-slate-700 bg-slate-800/30 opacity-40 cursor-not-allowed"
                    : isPro
                        ? "border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.15)] scale-105 z-10 bg-slate-800"
                        : "border-slate-700 bg-slate-800 hover:border-slate-500"
                }`}
        >
            {/* Badges superiores */}
            {isPro && !disabled && (
                <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                    Recomendado
                </div>
            )}
            {isAnnual && plan.savings && !disabled && (
                <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                    Ahorrás {formatPrice(plan.savings)} pagando anual
                </div>
            )}
            {disabled && (
                <div className="bg-slate-700 text-slate-500 text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                    Solo disponible en mensual
                </div>
            )}

            <div className="flex flex-col h-full p-6 gap-5">
                {/* Nombre y descripción */}
                <div>
                    <h3 className={`text-xl font-bold mb-1 ${disabled ? "text-slate-500" : "text-white"}`}>
                        {plan.name}
                    </h3>
                    <p className="text-slate-400 text-sm min-h-[36px] leading-snug">{plan.description}</p>
                </div>

                {/* Precio */}
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold ${disabled ? "text-slate-600" : "text-white"}`}>
                            {formatPrice(plan.price)}
                        </span>
                        <span className="text-slate-400 text-sm">/{isAnnual ? "año" : "mes"}</span>
                    </div>
                    {isAnnual && plan.monthlyEquivalent && (
                        <p className="text-sm text-emerald-400 mt-1 font-medium">
                            Equivale a {formatPrice(plan.monthlyEquivalent)}/mes
                        </p>
                    )}
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2.5">
                    <FeatureRow
                        included={true}
                        text={
                            plan.limits.products === -1
                                ? "Productos Ilimitados"
                                : `Hasta ${plan.limits.products.toLocaleString("es-AR")} productos`
                        }
                        highlight={plan.limits.products === -1}
                    />
                    <FeatureRow
                        included={true}
                        text={
                            plan.limits.users === 0
                                ? "Solo el dueño"
                                : `Hasta ${plan.limits.users} empleados`
                        }
                    />

                    <div className="border-t border-slate-700 my-1" />

                    <FeatureRow
                        included={plan.features.current_account}
                        text="Cuentas Corrientes (Fiado)"
                        tooltip="Vender a crédito y registrar deudas de clientes"
                        highlight={plan.features.current_account}
                    />
                    <FeatureRow
                        included={plan.features.multi_price_lists}
                        text="Listas de precios múltiples"
                        tooltip="Precios diferenciados por mayorista, minorista, etc."
                    />
                    <FeatureRow
                        included={plan.features.bulk_products_update}
                        text="Actualización masiva de precios"
                        tooltip="Actualizar todos los precios por porcentaje"
                    />
                    <FeatureRow
                        included={true}
                        text={plan.features.reports === "basic" ? "Reportes básicos" : "Reportes avanzados"}
                    />
                    <FeatureRow
                        included={plan.features.excel_reports_export}
                        text="Exportar a Excel"
                        tooltip="Descargar reportes en formato Excel"
                    />
                    <FeatureRow
                        included={true}
                        text="Módulo de Gastos"
                        tooltip="Registrá gastos del negocio y visualizá tu ganancia real"
                    />

                    {/* Soporte */}
                    <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Soporte</p>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className={`text-sm ${isVIP ? "font-semibold text-emerald-400" : "text-slate-300"}`}>
                                {supportText}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botón */}
                <button
                    onClick={() => !disabled && onSelect(plan.id)}
                    disabled={disabled}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 mt-2
                        ${disabled
                            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer"
                        }`}
                >
                    {disabled ? "No disponible en anual" : "Suscribirte →"}
                </button>
            </div>
        </div>
    );
}

// ─── Formulario (necesita useSearchParams → debe estar en Suspense) ───────────
function RegistrarseForm({ selectedPlanId, getSelectedPlanName, onBack }: {
    selectedPlanId: string;
    getSelectedPlanName: () => string;
    onBack: () => void;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const referralCode = searchParams.get("ref") || "";

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        businessType: "kiosco",
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
                    referralCode: referralCode || undefined,
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
        <div className="w-full max-w-md relative z-10">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700 p-8">
                <button
                    onClick={onBack}
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
                            name="fullName" type="text" required
                            value={form.fullName} onChange={handleChange}
                            placeholder="Juan García"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del negocio</label>
                        <input
                            name="businessName" type="text" required
                            value={form.businessName} onChange={handleChange}
                            placeholder="Kiosco El Sol"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de negocio</label>
                        <select
                            name="businessType"
                            value={form.businessType} onChange={handleChange}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            {BUSINESS_TYPES.map((bt) => (
                                <option key={bt.value} value={bt.value}>{bt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                        <input
                            name="email" type="email" required
                            value={form.email} onChange={handleChange}
                            placeholder="juan@ejemplo.com"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                        <input
                            name="password" type="password" required
                            value={form.password} onChange={handleChange}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Repetir contraseña</label>
                        <input
                            name="confirmPassword" type="password" required
                            value={form.confirmPassword} onChange={handleChange}
                            placeholder="Repetí tu contraseña"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit" disabled={loading}
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
                    <a href="/login" className="text-emerald-400 hover:underline font-medium">
                        Iniciá sesión
                    </a>
                </p>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RegistrarsePage() {
    const [step, setStep] = useState<"plan" | "form">("plan");
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");
    const [billing, setBilling] = useState<BillingCycle>("monthly");

    function handleSelectPlan(planId: string) {
        setSelectedPlanId(planId);
        setStep("form");
    }

    function getSelectedPlanName(): string {
        const plan = Object.values(PLANS).find(p => p.id === selectedPlanId) as any;
        if (!plan) return selectedPlanId;
        const isAnnual = selectedPlanId.endsWith("_annual");
        return `${plan.name} — ${isAnnual ? "anual" : "mensual"}`;
    }

    // Planes por ciclo
    const monthlyPlans: (keyof typeof PLANS)[] = ["STARTER", "PROFESSIONAL", "BUSINESS"];
    const annualPlans: (keyof typeof PLANS)[] = ["STARTER", "PROFESSIONAL_ANNUAL", "BUSINESS_ANNUAL"];

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
                <p className="text-slate-400 mt-1">Planes diseñados para kioscos y almacenes en Argentina.</p>
            </div>

            {/* ── STEP 1 — PLANES ── */}
            {step === "plan" && (
                <div className="w-full max-w-5xl relative z-10">
                    <h2 className="text-xl font-semibold text-white mb-4 text-center">Elegí tu plan</h2>

                    {/* Toggle */}
                    <div className="flex items-center justify-center gap-3 mb-10">
                        <span className={`text-sm font-medium ${billing === "monthly" ? "text-white" : "text-slate-400"}`}>
                            Mensual
                        </span>
                        <button
                            type="button"
                            onClick={() => setBilling(prev => prev === "monthly" ? "annual" : "monthly")}
                            className={`relative w-12 h-6 rounded-full transition-colors ${billing === "annual" ? "bg-emerald-500" : "bg-slate-600"}`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === "annual" ? "translate-x-6" : "translate-x-0"}`} />
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

                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                        {(billing === "monthly" ? monthlyPlans : annualPlans).map((key) => (
                            <PlanCard
                                key={key}
                                planKey={key}
                                onSelect={handleSelectPlan}
                                disabled={billing === "annual" && key === "STARTER"}
                            />
                        ))}
                    </div>

                    <p className="text-center text-sm text-slate-500 mt-8">
                        ¿Ya tenés cuenta?{" "}
                        <a href="/login" className="text-emerald-400 hover:underline font-medium">
                            Iniciá sesión
                        </a>
                    </p>
                </div>
            )}

            {/* ── STEP 2 — FORMULARIO ── */}
            {step === "form" && (
                <Suspense fallback={
                    <div className="w-full max-w-md h-96 rounded-2xl bg-slate-800/50 animate-pulse" />
                }>
                    <RegistrarseForm
                        selectedPlanId={selectedPlanId}
                        getSelectedPlanName={getSelectedPlanName}
                        onBack={() => setStep("plan")}
                    />
                </Suspense>
            )}
        </div>
    );
}
