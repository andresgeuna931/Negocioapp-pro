'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, TrendingUp, Building2, DollarSign, Plus, MoreVertical,
    Check, X, Pencil, Trash2, UserMinus, UserCheck, Network, Calendar, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    createSeller, updateSeller, toggleSellerActive, deleteSeller,
    assignTenantToSeller, removeAssignment, recordCommissionPayment,
} from '@/lib/actions/sellers';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Assignment {
    id: string;
    assigned_at: string;
    activation_date: string | null;
    payment_date: string | null;
    tenant: {
        id: string;
        business_name: string;
        plan_type: string;
        subscription_status: string;
        subscriptions: Array<{ plan_id: string; status: string }>;
    };
}

interface Seller {
    id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    commission_pct: number;
    commission_fixed: boolean;
    referred_by: string | null;
    activeClients: number;
    totalClients: number;
    monthlyRevenue: number;
    monthlyCommission: number;
    directCommission: number;
    referredSellersCount: number;
    networkActiveClients: number;
    referralThreshold: number;
    referralCommission: number;
    seller_assignments: Assignment[];
}

interface SellersClientProps {
    sellers: Seller[];
    unassignedTenants: Array<{ id: string; business_name: string }>;
    totalMonthlyCommissions: number;
    totalActiveClients: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
    starter: 'Starter · $19.000/mes',
    professional: 'Profesional · $39.000/mes',
    business: 'Business · $49.000/mes',
    professional_annual: 'Profesional Anual',
    business_annual: 'Business Anual',
};

function getLevelLabel(pct: number, fixed: boolean): string {
    if (fixed) return 'Fijo';
    if (pct >= 30) return 'Nivel 4';
    if (pct >= 27) return 'Nivel 3';
    if (pct >= 24) return 'Nivel 2';
    return 'Nivel 1';
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getNextThreshold(networkActive: number): number {
    if (networkActive < 10) return 10;
    if (networkActive < 20) return 20;
    if (networkActive < 30) return 30;
    if (networkActive < 50) return 50;
    return 50;
}

function getReferralPctLabel(threshold: number): string {
    if (threshold >= 50) return '12%';
    if (threshold >= 30) return '9%';
    if (threshold >= 20) return '7%';
    if (threshold >= 10) return '5%';
    return '5%';
}

// ─── Componente principal ────────────────────────────────────────────────────

export function SellersClient({ sellers, unassignedTenants, totalMonthlyCommissions, totalActiveClients }: SellersClientProps) {
    const router = useRouter();
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(sellers[0] ?? null);
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [isNetworkOpen, setIsNetworkOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Nuevo vendedor
    const [newFixed, setNewFixed] = useState(false);
    const [newPct, setNewPct] = useState('20');
    const [newReferredBy, setNewReferredBy] = useState('');

    // Editar
    const [editFixed, setEditFixed] = useState(false);
    const [editPct, setEditPct] = useState('20');

    const filtered = sellers.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    const currentMonth = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    // ─── Handlers ──────────────────────────────────────────────────────────

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const fd = new FormData(e.currentTarget);
        fd.set('commission_fixed', newFixed ? 'true' : 'false');
        fd.set('commission_pct', newFixed ? newPct : '20');
        if (newReferredBy) fd.set('referred_by', newReferredBy);
        const res = await createSeller(fd);
        setIsLoading(false);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Vendedor creado');
        setIsNewOpen(false);
        setNewFixed(false);
        setNewPct('20');
        setNewReferredBy('');
        router.refresh();
    };

    const handleEditSave = async () => {
        if (!selectedSeller) return;
        const pct = Number(editPct);
        if (isNaN(pct) || pct < 1 || pct > 100) { toast.error('Porcentaje inválido'); return; }
        const res = await updateSeller(selectedSeller.id, {
            commission_fixed: editFixed,
            commission_pct: editFixed ? pct : selectedSeller.commission_pct,
        });
        if (res.error) { toast.error(res.error); return; }
        toast.success('Comisión actualizada');
        setIsEditOpen(false);
        router.refresh();
    };

    const openEdit = (seller: Seller) => {
        setSelectedSeller(seller);
        setEditFixed(seller.commission_fixed);
        setEditPct(String(seller.commission_pct));
        setIsEditOpen(true);
    };

    const handleToggleActive = async (seller: Seller) => {
        const res = await toggleSellerActive(seller.id, !seller.is_active);
        if (res.error) { toast.error(res.error); return; }
        toast.success(seller.is_active ? 'Vendedor desactivado' : 'Vendedor activado');
        router.refresh();
    };

    const handleDelete = async (seller: Seller) => {
        if (!confirm(`¿Eliminar a ${seller.full_name}? Se perderán todas sus asignaciones.`)) return;
        const res = await deleteSeller(seller.id);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Vendedor eliminado');
        setSelectedSeller(null);
        router.refresh();
    };

    const handleAssign = async (tenantId: string) => {
        if (!selectedSeller) return;
        const res = await assignTenantToSeller(selectedSeller.id, tenantId);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Negocio asignado');
        setIsAssignOpen(false);
        router.refresh();
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        const res = await removeAssignment(assignmentId);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Asignación eliminada');
        router.refresh();
    };

    const handleMarkPaid = async () => {
        if (!selectedSeller) return;
        const month = new Date().toISOString().slice(0, 7);
        const res = await recordCommissionPayment(selectedSeller.id, selectedSeller.monthlyCommission, month);
        if (res.error) { toast.error(res.error); return; }
        toast.success(`Pago de ${formatCurrency(selectedSeller.monthlyCommission)} registrado`);
        setIsPayOpen(false);
        router.refresh();
    };

    // Vendedores disponibles para referir (excluyendo el actual y sus propios referidos)
    const availableReferrers = sellers.filter(s => s.id !== selectedSeller?.id);

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vendedores</h1>
                    <p className="text-sm text-slate-500 mt-1">Comisiones · Niveles · Red de referidos</p>
                </div>
                <Button onClick={() => setIsNewOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nuevo vendedor
                </Button>
            </div>

            {/* STAT TILES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Vendedores activos', value: sellers.filter(s => s.is_active).length, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Clientes activos', value: totalActiveClients, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: `Comisiones ${currentMonth}`, value: formatCurrency(totalMonthlyCommissions), icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Sin asignar', value: unassignedTenants.length, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map(tile => (
                    <Card key={tile.label}>
                        <CardContent className="p-5">
                            <div className={`w-9 h-9 rounded-lg ${tile.bg} flex items-center justify-center mb-3`}>
                                <tile.icon className={`w-5 h-5 ${tile.color}`} />
                            </div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{tile.label}</p>
                            <p className="text-2xl font-bold mt-1">{tile.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* PANEL PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LISTA */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Todos los vendedores</CardTitle>
                                    <CardDescription>Corte: 1° de cada mes</CardDescription>
                                </div>
                            </div>
                            <Input
                                placeholder="Buscar vendedor..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="mt-2"
                            />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.length === 0 && (
                                    <div className="py-10 text-center text-slate-400">
                                        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                        <p>No hay vendedores</p>
                                    </div>
                                )}
                                {filtered.map(seller => (
                                    <div
                                        key={seller.id}
                                        onClick={() => setSelectedSeller(seller)}
                                        className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${selectedSeller?.id === seller.id ? 'bg-purple-500/5 border-l-2 border-purple-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {seller.full_name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">{seller.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {seller.email}
                                                {seller.referred_by && (() => {
                                                    const referrer = sellers.find((s: any) => s.id === seller.referred_by);
                                                    return referrer ? <span className="ml-2 text-purple-400">· Ref. por {referrer.full_name}</span> : null;
                                                })()}
                                            </p>
                                        </div>

                                        {/* Clientes activos */}
                                        <div className="text-center hidden sm:block">
                                            <p className="font-semibold text-sm">{seller.activeClients}</p>
                                            <p className="text-xs text-slate-400">clientes</p>
                                        </div>

                                        {/* % + nivel */}
                                        <div className="text-center hidden sm:block">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${seller.commission_fixed ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                {seller.commission_pct}% {seller.commission_fixed ? <Lock className="inline w-2.5 h-2.5 mb-0.5" /> : getLevelLabel(seller.commission_pct, false)}
                                            </span>
                                        </div>

                                        {/* Red referidos */}
                                        {seller.referredSellersCount > 0 && (
                                            <div className="text-center hidden md:block">
                                                <p className="text-xs text-purple-400 font-medium">
                                                    <Network className="inline w-3 h-3 mr-0.5" />
                                                    {seller.networkActiveClients} neg.
                                                </p>
                                                <p className="text-xs text-slate-400">en red</p>
                                            </div>
                                        )}

                                        {/* Comisión mes */}
                                        <div className="text-right">
                                            <p className="font-semibold text-sm text-amber-500">{formatCurrency(seller.monthlyCommission)}</p>
                                            <p className="text-xs text-slate-400">este mes</p>
                                        </div>

                                        <Badge variant={seller.is_active ? 'success' : 'default'}>
                                            {seller.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                                <DropdownMenuItem className="cursor-pointer gap-2" onClick={e => { e.stopPropagation(); openEdit(seller); }}>
                                                    <Pencil className="w-4 h-4" /> Editar comisión
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer gap-2" onClick={e => { e.stopPropagation(); handleToggleActive(seller); }}>
                                                    {seller.is_active
                                                        ? <><UserMinus className="w-4 h-4 text-red-400" /><span className="text-red-400">Desactivar</span></>
                                                        : <><UserCheck className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Activar</span></>}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10" onClick={e => { e.stopPropagation(); handleDelete(seller); }}>
                                                    <Trash2 className="w-4 h-4" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* PANEL DETALLE */}
                <div>
                    {selectedSeller ? (
                        <Card>
                            <CardHeader className="pb-3 bg-gradient-to-br from-purple-500/5 to-transparent">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg mb-2">
                                    {selectedSeller.full_name.charAt(0).toUpperCase()}
                                </div>
                                <CardTitle className="text-base">{selectedSeller.full_name}</CardTitle>
                                <CardDescription>{selectedSeller.email}</CardDescription>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${selectedSeller.commission_fixed ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {selectedSeller.commission_fixed ? `Fijo ${selectedSeller.commission_pct}%` : `${getLevelLabel(selectedSeller.commission_pct, false)} · ${selectedSeller.commission_pct}%`}
                                    </span>
                                    {selectedSeller.referred_by && (() => {
                                        const referrer = sellers.find((s: any) => s.id === selectedSeller.referred_by);
                                        return referrer ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                                <Network className="inline w-3 h-3 mr-0.5" />
                                                Ref. por {referrer.full_name}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                {/* Stats grid */}
                                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
                                    <div className="p-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Clientes activos</p>
                                        <p className="text-lg font-bold">{selectedSeller.activeClients}</p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Comisión directa</p>
                                        <p className="text-lg font-bold text-amber-500">{formatCurrency(selectedSeller.directCommission)}</p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Red referidos</p>
                                        <p className="text-lg font-bold text-purple-400">
                                            {selectedSeller.networkActiveClients > 0
                                                ? `${selectedSeller.networkActiveClients} neg.`
                                                : '—'}
                                        </p>
                                        {selectedSeller.networkActiveClients > 0 && selectedSeller.referralThreshold < 10 && (
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Faltan {10 - selectedSeller.networkActiveClients} para cobrar
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Comisión red ({getReferralPctLabel(selectedSeller.referralThreshold)})</p>
                                        <p className="text-lg font-bold text-purple-400">
                                            {selectedSeller.referralCommission > 0
                                                ? formatCurrency(selectedSeller.referralCommission)
                                                : '—'}
                                        </p>
                                        {selectedSeller.referralThreshold >= 10 && (
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Sobre {selectedSeller.referralThreshold} neg.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Total mes */}
                                <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-300">Total a cobrar</span>
                                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(selectedSeller.monthlyCommission)}</span>
                                </div>

                                {/* Referidos — botón ver red */}
                                {selectedSeller.referredSellersCount > 0 && (
                                    <div className="px-4 mt-3">
                                        <button
                                            onClick={() => setIsNetworkOpen(true)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 text-sm text-purple-400">
                                                <Network className="w-4 h-4" />
                                                Ver red de referidos ({selectedSeller.referredSellersCount} vendedores)
                                            </div>
                                            <span className="text-xs text-slate-500">›</span>
                                        </button>
                                    </div>
                                )}

                                {/* Negocios asignados */}
                                <div className="p-4 space-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Negocios asignados</p>
                                        {unassignedTenants.length > 0 && (
                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setIsAssignOpen(true)}>
                                                <Plus className="w-3 h-3" /> Asignar
                                            </Button>
                                        )}
                                    </div>

                                    {selectedSeller.seller_assignments.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-4">Sin negocios asignados</p>
                                    )}

                                    {selectedSeller.seller_assignments.map(a => {
                                        const isActive = a.tenant?.subscription_status === 'active';
                                        const isTrial = a.tenant?.subscription_status === 'trial';
                                        return (
                                            <div key={a.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : isTrial ? 'bg-amber-500' : 'bg-slate-400'}`} />
                                                    <p className="text-sm font-medium flex-1 truncate">{a.tenant?.business_name}</p>
                                                    <button onClick={() => handleRemoveAssignment(a.id)} className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="pl-4 space-y-0.5">
                                                    <p className="text-xs text-slate-400">{PLAN_LABELS[a.tenant?.plan_type ?? ''] ?? 'Sin plan'}</p>
                                                    {isTrial && a.activation_date && (
                                                        <p className="text-xs text-amber-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            Activo el {formatDate(a.activation_date)}
                                                        </p>
                                                    )}
                                                    {isActive && a.payment_date && (
                                                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                                                            <Check className="w-3 h-3" />
                                                            Comisión en corte del {formatDate(a.payment_date)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Acciones */}
                                <div className="p-4 pt-0 flex gap-2">
                                    <Button
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                                        onClick={() => setIsPayOpen(true)}
                                        disabled={selectedSeller.monthlyCommission === 0}
                                    >
                                        <Check className="w-4 h-4" /> Marcar pagado
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="py-16 text-center text-slate-400">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Seleccioná un vendedor para ver el detalle</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* ─── DIALOG: Nuevo vendedor ─── */}
            <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo vendedor</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre completo</label>
                            <Input name="full_name" placeholder="Ej: Martín Rodríguez" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input name="email" type="email" placeholder="vendedor@email.com" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Referido por (opcional)</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm"
                                value={newReferredBy}
                                onChange={e => setNewReferredBy(e.target.value)}
                            >
                                <option value="">— Sin referidor —</option>
                                {sellers.filter(s => s.is_active).map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Tipo de comisión</label>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
                                <div>
                                    <p className="text-sm font-medium">Comisión fija</p>
                                    <p className="text-xs text-slate-400">Si activás esto, el % no varía con los niveles</p>
                                </div>
                                <button
                                        type="button"
                                        onClick={() => setNewFixed(!newFixed)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newFixed ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${newFixed ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                            </div>
                            {newFixed && (
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Porcentaje fijo</label>
                                    <Input
                                        type="number"
                                        value={newPct}
                                        onChange={e => setNewPct(e.target.value)}
                                        min={1} max={100}
                                        placeholder="Ej: 35"
                                    />
                                </div>
                            )}
                            {!newFixed && (
                                <p className="text-xs text-slate-500">Arranca en 20% · sube automáticamente con los negocios activos</p>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Creando...' : 'Crear vendedor'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── DIALOG: Editar comisión ─── */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Editar comisión — {selectedSeller?.full_name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
                            <div>
                                <p className="text-sm font-medium">Comisión fija</p>
                                <p className="text-xs text-slate-400">Si activás esto, el % no varía con los niveles</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditFixed(!editFixed)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editFixed ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editFixed ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {editFixed && (
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Porcentaje fijo</label>
                                <Input
                                    type="number"
                                    value={editPct}
                                    onChange={e => setEditPct(e.target.value)}
                                    min={1} max={100}
                                />
                            </div>
                        )}
                        {!editFixed && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
                                El % se calculará automáticamente según negocios activos:<br />
                                <span className="text-xs text-slate-400 mt-1 block">0-9 → 20% · 10-19 → 24% · 20-29 → 27% · 30+ → 30%</span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleEditSave}>Guardar cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── DIALOG: Red de referidos ─── */}
            <Dialog open={isNetworkOpen} onOpenChange={setIsNetworkOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Red de referidos — {selectedSeller?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        {/* Progreso hacia siguiente umbral */}
                        {selectedSeller && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">Negocios activos en red</span>
                                    <span className="font-bold text-purple-400">{selectedSeller.networkActiveClients}</span>
                                </div>
                                {selectedSeller.referralThreshold >= 10 ? (
                                    <p className="text-xs text-emerald-400">
                                        ✓ Cobrás {getReferralPctLabel(selectedSeller.referralThreshold)} sobre {selectedSeller.referralThreshold} negocios · {formatCurrency(selectedSeller.referralCommission)}/mes
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-400">
                                        Faltan {10 - selectedSeller.networkActiveClients} negocios para alcanzar el primer umbral (10)
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Lista de vendedores referidos */}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {sellers
                                .filter(s => s.referred_by === selectedSeller?.id)
                                .map(s => (
                                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                            {s.full_name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{s.full_name}</p>
                                            <p className="text-xs text-slate-400">{s.activeClients} negocios activos</p>
                                        </div>
                                        <span className="text-xs text-purple-400 font-semibold">{formatCurrency(s.monthlyRevenue)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNetworkOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── DIALOG: Asignar tenant ─── */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Asignar negocio a {selectedSeller?.full_name}</DialogTitle></DialogHeader>
                    <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
                        {unassignedTenants.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6">Todos los negocios ya están asignados</p>
                        )}
                        {unassignedTenants.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleAssign(t.id)}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                            >
                                {t.business_name}
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── DIALOG: Confirmar pago ─── */}
            <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Registrar pago de comisión</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm text-slate-500">
                            Vas a registrar el pago de <strong>{selectedSeller?.full_name}</strong> — {currentMonth}.
                        </p>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex justify-between text-sm text-slate-400 mb-1">
                                <span>Comisión directa ({selectedSeller?.commission_pct}%)</span>
                                <span>{formatCurrency(selectedSeller?.directCommission ?? 0)}</span>
                            </div>
                            {(selectedSeller?.referralCommission ?? 0) > 0 && (
                                <div className="flex justify-between text-sm text-slate-400 mb-2">
                                    <span>Comisión red ({getReferralPctLabel(selectedSeller?.referralThreshold ?? 0)} · {selectedSeller?.referralThreshold} neg.)</span>
                                    <span>{formatCurrency(selectedSeller?.referralCommission ?? 0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-emerald-400 text-lg border-t border-emerald-500/20 pt-2">
                                <span>Total</span>
                                <span>{formatCurrency(selectedSeller?.monthlyCommission ?? 0)}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleMarkPaid} className="bg-emerald-600 hover:bg-emerald-700">
                            <Check className="w-4 h-4 mr-2" /> Confirmar pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
