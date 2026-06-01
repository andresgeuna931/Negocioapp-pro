'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, Copy, Check, Plus, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { createTenantInvitation, revokeInvitation } from '@/lib/actions/tenant-invitations';
import { PLANS, formatPrice } from '@/lib/config/plans';

const PLAN_OPTIONS = [
    { id: 'starter', label: 'Starter', price: '$19.000/mes' },
    { id: 'professional', label: 'Profesional', price: '$39.000/mes' },
    { id: 'professional_annual', label: 'Profesional Anual', price: '$390.000/año' },
    { id: 'business', label: 'Business', price: '$49.000/mes' },
    { id: 'business_annual', label: 'Business Anual', price: '$490.000/año' },
];

interface Invitation {
    id: string;
    token: string;
    plan_id: string;
    billing: string;
    notes: string | null;
    expires_at: string;
    used_at: string | null;
    created_at: string;
}

interface Props {
    invitations: Invitation[];
}

export function InvitationManager({ invitations: initialInvitations }: Props) {
    const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
    const [selectedPlan, setSelectedPlan] = useState('professional');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [newLink, setNewLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://negocioapp-pro.vercel.app';

    function getInvitationStatus(inv: Invitation) {
        if (inv.used_at) return 'used';
        if (new Date(inv.expires_at) <= new Date()) return 'expired';
        return 'pending';
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'pending':
                return (
                    <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Pendiente
                    </span>
                );
            case 'used':
                return (
                    <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Usado
                    </span>
                );
            case 'expired':
                return (
                    <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Vencido
                    </span>
                );
        }
    }

    async function handleCreate() {
        setLoading(true);
        setError(null);
        setNewLink(null);

        try {
            const result = await createTenantInvitation(
                selectedPlan as any,
                notes || undefined
            );

            if (result.error) {
                setError(result.error);
                return;
            }

            setNewLink(result.url!);
            setNotes('');

            // Recargar página para ver la nueva invitación en la lista
            window.location.reload();

        } catch (e) {
            setError('Error al generar el link. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    async function handleRevoke(id: string) {
        if (!confirm('¿Seguro que querés revocar este link?')) return;

        const result = await revokeInvitation(id);
        if (result.error) {
            alert(result.error);
            return;
        }
        window.location.reload();
    }

    async function handleCopy(url: string) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-4">
            {/* Generador de links */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-500" />
                        Generar nuevo link
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Selector de plan */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {PLAN_OPTIONS.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    selectedPlan === plan.id
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                <p className="text-xs font-semibold">{plan.label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{plan.price}</p>
                            </button>
                        ))}
                    </div>

                    {/* Nota opcional */}
                    <input
                        type="text"
                        placeholder="Nota opcional — ej: Kiosco de Juan en Córdoba"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {/* Botón generar */}
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-all disabled:opacity-50"
                    >
                        {loading ? 'Generando...' : 'Generar link de invitación'}
                    </button>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    {/* Link generado */}
                    {newLink && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 truncate flex-1">{newLink}</p>
                            <button
                                onClick={() => handleCopy(newLink)}
                                className="shrink-0 p-1.5 rounded-lg hover:bg-emerald-500/20 transition-all"
                            >
                                {copied
                                    ? <Check className="w-4 h-4 text-emerald-500" />
                                    : <Copy className="w-4 h-4 text-emerald-500" />
                                }
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lista de invitaciones */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Historial de invitaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    {invitations.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-6">
                            No hay invitaciones generadas todavía.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {invitations.map((inv) => {
                                const status = getInvitationStatus(inv);
                                const url = `${baseUrl}/unirse/${inv.token}`;
                                const planOption = PLAN_OPTIONS.find(p => p.id === inv.plan_id);

                                return (
                                    <div
                                        key={inv.id}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold">{planOption?.label || inv.plan_id}</p>
                                                {getStatusBadge(status)}
                                            </div>
                                            {inv.notes && (
                                                <p className="text-xs text-slate-500 mb-1">{inv.notes}</p>
                                            )}
                                            <p className="text-xs text-slate-400 truncate">{url}</p>
                                            <p className="text-xs text-slate-400">
                                                Vence: {new Date(inv.expires_at).toLocaleDateString('es-AR', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleCopy(url)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                        title="Copiar link"
                                                    >
                                                        <Copy className="w-4 h-4 text-slate-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRevoke(inv.id)}
                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                                                        title="Revocar"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
