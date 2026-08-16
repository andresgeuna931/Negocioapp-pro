'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, TrendingUp, Building2, DollarSign, Plus, MoreVertical, Check, X, Pencil, Trash2, UserMinus, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    createSeller,
    updateSellerCommission,
    toggleSellerActive,
    deleteSeller,
    assignTenantToSeller,
    removeAssignment,
    recordCommissionPayment,
} from '@/lib/actions/sellers';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Seller {
    id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    commission_pct: number;
    activeClients: number;
    totalClients: number;
    monthlyRevenue: number;
    monthlyCommission: number;
    seller_assignments: Array<{
        id: string;
        tenant: { id: string; business_name: string; subscriptions: Array<{ plan_id: string; status: string }> };
    }>;
}

interface SellersClientProps {
    sellers: Seller[];
    unassignedTenants: Array<{ id: string; business_name: string }>;
    totalMonthlyCommissions: number;
    totalActiveClients: number;
}

const PLAN_LABELS: Record<string, string> = {
    starter: 'Starter · $19.000/mes',
    professional: 'Profesional · $39.000/mes',
    business: 'Business · $49.000/mes',
};

export function SellersClient({ sellers, unassignedTenants, totalMonthlyCommissions, totalActiveClients }: SellersClientProps) {
    const router = useRouter();
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(sellers[0] ?? null);
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [editingCommission, setEditingCommission] = useState(false);
    const [commissionInput, setCommissionInput] = useState('');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const filtered = sellers.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const fd = new FormData(e.currentTarget);
        const res = await createSeller(fd);
        setIsLoading(false);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Vendedor creado');
        setIsNewOpen(false);
        router.refresh();
    };

    const handleCommissionSave = async () => {
        if (!selectedSeller) return;
        const pct = Number(commissionInput);
        if (isNaN(pct) || pct < 0 || pct > 100) { toast.error('Porcentaje inválido'); return; }
        const res = await updateSellerCommission(selectedSeller.id, pct);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Comisión actualizada');
        setEditingCommission(false);
        router.refresh();
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
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const res = await recordCommissionPayment(selectedSeller.id, selectedSeller.monthlyCommission, month);
        if (res.error) { toast.error(res.error); return; }
        toast.success(`Pago de ${formatCurrency(selectedSeller.monthlyCommission)} registrado`);
        setIsPayOpen(false);
        router.refresh();
    };

    const currentMonth = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vendedores</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestión de comisiones por suscripción activa</p>
                </div>
                <Button onClick={() => setIsNewOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nuevo vendedor
                </Button>
            </div>

            {/* STAT TILES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Vendedores activos', value: sellers.filter(s => s.is_active).length, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Clientes asignados', value: totalActiveClients, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: `Comisiones ${currentMonth}`, value: formatCurrency(totalMonthlyCommissions), icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Negocios sin asignar', value: unassignedTenants.length, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map((tile) => (
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

                {/* TABLA */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Todos los vendedores</CardTitle>
                                    <CardDescription>{currentMonth}</CardDescription>
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
                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {seller.full_name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">{seller.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{seller.email}</p>
                                        </div>

                                        {/* Clientes */}
                                        <div className="text-center hidden sm:block">
                                            <p className="font-semibold text-sm">{seller.activeClients}</p>
                                            <p className="text-xs text-slate-400">clientes</p>
                                        </div>

                                        {/* Comisión % */}
                                        <div className="text-center hidden sm:block">
                                            <span className="text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                                                {seller.commission_pct}%
                                            </span>
                                        </div>

                                        {/* Monto mes */}
                                        <div className="text-right">
                                            <p className="font-semibold text-sm text-amber-500">{formatCurrency(seller.monthlyCommission)}</p>
                                            <p className="text-xs text-slate-400">este mes</p>
                                        </div>

                                        {/* Badge estado */}
                                        <Badge variant={seller.is_active ? 'success' : 'default'}>
                                            {seller.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>

                                        {/* Menú */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                                <DropdownMenuItem
                                                    className="cursor-pointer gap-2"
                                                    onClick={e => { e.stopPropagation(); handleToggleActive(seller); }}
                                                >
                                                    {seller.is_active
                                                        ? <><UserMinus className="w-4 h-4 text-red-400" /><span className="text-red-400">Desactivar</span></>
                                                        : <><UserCheck className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Activar</span></>
                                                    }
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="cursor-pointer gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                                    onClick={e => { e.stopPropagation(); handleDelete(seller); }}
                                                >
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
                            </CardHeader>

                            <CardContent className="p-0">
                                {/* Stats 2x2 */}
                                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
                                    {[
                                        { label: 'Clientes activos', value: selectedSeller.activeClients },
                                        { label: 'Comisión mes', value: formatCurrency(selectedSeller.monthlyCommission), color: 'text-amber-500' },
                                        { label: 'Total clientes', value: selectedSeller.totalClients },
                                        {
                                            label: 'Comisión %',
                                            value: (
                                                <div className="flex items-center gap-1">
                                                    {editingCommission ? (
                                                        <>
                                                            <Input
                                                                type="number"
                                                                value={commissionInput}
                                                                onChange={e => setCommissionInput(e.target.value)}
                                                                className="h-7 w-16 text-sm p-1"
                                                                min={0} max={100}
                                                            />
                                                            <button onClick={handleCommissionSave} className="text-emerald-500 hover:text-emerald-400"><Check className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingCommission(false)} className="text-slate-400 hover:text-slate-300"><X className="w-4 h-4" /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-lg font-bold">{selectedSeller.commission_pct}%</span>
                                                            <button onClick={() => { setEditingCommission(true); setCommissionInput(String(selectedSeller.commission_pct)); }} className="text-slate-400 hover:text-slate-300 ml-1">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        },
                                    ].map((stat, i) => (
                                        <div key={i} className="p-4">
                                            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{stat.label}</p>
                                            <div className={`text-lg font-bold ${(stat as any).color ?? ''}`}>{stat.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Clientes asignados */}
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
                                        const sub = a.tenant?.subscriptions?.[0];
                                        const isActive = sub?.status === 'active';
                                        return (
                                            <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{a.tenant?.business_name}</p>
                                                    <p className="text-xs text-slate-400">{PLAN_LABELS[sub?.plan_id ?? ''] ?? 'Sin plan'}</p>
                                                </div>
                                                <button onClick={() => handleRemoveAssignment(a.id)} className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Acción pago */}
                                <div className="p-4 pt-0 flex gap-2">
                                    <Button
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                                        onClick={() => setIsPayOpen(true)}
                                        disabled={selectedSeller.monthlyCommission === 0}
                                    >
                                        <Check className="w-4 h-4" />
                                        Marcar pagado
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

            {/* DIALOG — Nuevo vendedor */}
            <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo vendedor</DialogTitle>
                    </DialogHeader>
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
                            <label className="text-sm font-medium">Comisión (%)</label>
                            <Input name="commission_pct" type="number" defaultValue={20} min={0} max={100} required />
                            <p className="text-xs text-slate-400">Por defecto 20% — podés editarlo después individualmente</p>
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

            {/* DIALOG — Asignar tenant */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Asignar negocio a {selectedSeller?.full_name}</DialogTitle>
                    </DialogHeader>
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
                        <DialogClose asChild>
                            <Button variant="outline">Cerrar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG — Confirmar pago */}
            <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar pago de comisión</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm text-slate-500">
                            Vas a registrar el pago de comisión de <strong>{selectedSeller?.full_name}</strong> correspondiente a {currentMonth}.
                        </p>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <p className="text-xs text-slate-400 mb-1">Monto a pagar</p>
                            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(selectedSeller?.monthlyCommission ?? 0)}</p>
                            <p className="text-xs text-slate-400 mt-1">{selectedSeller?.commission_pct}% sobre {formatCurrency(selectedSeller?.monthlyRevenue ?? 0)} en suscripciones activas</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleMarkPaid} className="bg-emerald-600 hover:bg-emerald-700">
                            <Check className="w-4 h-4 mr-2" /> Confirmar pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
