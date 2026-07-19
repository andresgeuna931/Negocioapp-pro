'use client';

import { useState } from 'react';
import { Wallet, DoorOpen, DoorClosed, Plus, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { openCashSession, closeCashSession, addCashMovement } from '@/lib/actions/cash';
import { useRouter } from 'next/navigation';
import type { CashSession } from '@/lib/types';

interface CashSessionCardProps {
    session: CashSession | null;
    expectedCash: number;
}

export function CashSessionCard({ session, expectedCash }: CashSessionCardProps) {
    const router = useRouter();
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState<'withdrawal' | 'deposit' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form states
    const [openingAmount, setOpeningAmount] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [closeNotes, setCloseNotes] = useState('');
    const [movementAmount, setMovementAmount] = useState('');
    const [movementDescription, setMovementDescription] = useState('');

    const handleOpenSession = async () => {
        setLoading(true);
        setError('');
        const result = await openCashSession(parseFloat(openingAmount) || 0);
        if (result.error) {
            setError(result.error);
        } else {
            setShowOpenModal(false);
            setOpeningAmount('');
            router.refresh();
        }
        setLoading(false);
    };

    const handleCloseSession = async () => {
        setLoading(true);
        setError('');
        const result = await closeCashSession(parseFloat(actualCash) || 0, closeNotes || undefined);
        if (result.error) {
            setError(result.error);
        } else {
            setShowCloseModal(false);
            setActualCash('');
            setCloseNotes('');
            router.refresh();
        }
        setLoading(false);
    };

    const handleAddMovement = async () => {
        if (!showMovementModal) return;
        setLoading(true);
        setError('');
        const result = await addCashMovement(
            showMovementModal === 'withdrawal' ? 'expense' : 'deposit',
            parseFloat(movementAmount) || 0,
            movementDescription || undefined
        );
        if (result.error) {
            setError(result.error);
        } else {
            setShowMovementModal(null);
            setMovementAmount('');
            setMovementDescription('');
            router.refresh();
        }
        setLoading(false);
    };

    const difference = session ? parseFloat(actualCash || '0') - expectedCash : 0;

    if (!session) {
        // No session open - Show open button
        return (
            <>
                <Card className="border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <DoorClosed className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            Caja Cerrada
                        </h3>
                        <p className="text-slate-500 mb-6">
                            Abrí la caja para comenzar a registrar movimientos
                        </p>
                        <Button onClick={() => setShowOpenModal(true)} size="lg">
                            <DoorOpen className="w-5 h-5 mr-2" />
                            Abrir Caja
                        </Button>
                    </CardContent>
                </Card>

                {/* Open Modal */}
                {showOpenModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Abrir Caja</h3>
                                {error && (
                                    <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <Input
                                        type="number"
                                        label="Monto inicial en caja"
                                        placeholder="0"
                                        value={openingAmount}
                                        onChange={(e) => setOpeningAmount(e.target.value)}
                                        icon={<Wallet className="w-5 h-5" />}
                                    />
                                    <p className="text-sm text-slate-500">
                                        Ingresá cuánto efectivo hay en la caja al comenzar
                                    </p>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowOpenModal(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleOpenSession}
                                        loading={loading}
                                    >
                                        Abrir Caja
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </>
        );
    }

    // Session is open
    return (
        <>
            <Card className="border-2 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <DoorOpen className="w-7 h-7 text-emerald-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Caja Abierta
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                        Activa
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm">
                                    Desde {new Date(session.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Efectivo esperado</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(expectedCash)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-6">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMovementModal('withdrawal')}
                        >
                            <Minus className="w-4 h-4 mr-1" />
                            Retiro/Gasto
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMovementModal('deposit')}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Ingreso
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowCloseModal(true)}
                            className="ml-auto"
                        >
                            <DoorClosed className="w-4 h-4 mr-1" />
                            Cerrar Caja
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Close Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Cerrar Caja</h3>
                            {error && (
                                <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <p className="text-sm text-slate-500">Efectivo esperado</p>
                                    <p className="text-2xl font-bold">{formatCurrency(expectedCash)}</p>
                                </div>
                                <Input
                                    type="number"
                                    label="Efectivo real contado"
                                    placeholder="0"
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    icon={<Wallet className="w-5 h-5" />}
                                />
                                {actualCash && (
                                    <div className={`p-4 rounded-xl ${difference === 0
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : difference > 0
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        <p className="text-sm">Diferencia</p>
                                        <p className="text-xl font-bold">
                                            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                            {difference === 0 && ' ✓'}
                                            {difference > 0 && ' (Sobrante)'}
                                            {difference < 0 && ' (Faltante)'}
                                        </p>
                                    </div>
                                )}
                                <Input
                                    type="text"
                                    label="Notas (opcional)"
                                    placeholder="Observaciones del cierre..."
                                    value={closeNotes}
                                    onChange={(e) => setCloseNotes(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowCloseModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleCloseSession}
                                    loading={loading}
                                >
                                    Confirmar Cierre
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Movement Modal */}
            {showMovementModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {showMovementModal === 'withdrawal' ? 'Registrar Retiro/Gasto' : 'Registrar Ingreso'}
                            </h3>
                            {error && (
                                <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-4">
                                <Input
                                    type="number"
                                    label="Monto"
                                    placeholder="0"
                                    value={movementAmount}
                                    onChange={(e) => setMovementAmount(e.target.value)}
                                    icon={<Wallet className="w-5 h-5" />}
                                />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Descripción
                                        {showMovementModal === 'withdrawal' && (
                                            <span className="text-red-500 ml-1">*</span>
                                        )}
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder={showMovementModal === 'withdrawal' ? 'ej: Pago a proveedor' : 'ej: Cambio adicional'}
                                        value={movementDescription}
                                        onChange={(e) => setMovementDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowMovementModal(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleAddMovement}
                                    loading={loading}
                                >
                                    Registrar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
