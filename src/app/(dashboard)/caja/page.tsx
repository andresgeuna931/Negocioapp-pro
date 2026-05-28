import { Wallet, Clock, ArrowDownCircle, ArrowUpCircle, History, ArrowLeftRight, CreditCard, Smartphone, Building2, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentCashSession, getCashMovements, getCashSessionHistory } from '@/lib/actions/cash';
import { getSales } from '@/lib/actions/sales';
import { formatCurrency } from '@/lib/utils';
import { CashSessionCard } from '@/components/cash/cash-session-card';
import { CashHistoryTable } from '@/components/cash/cash-history-table';

export default async function CajaPage() {
    const [sessionResult, historyResult] = await Promise.all([
        getCurrentCashSession(),
        getCashSessionHistory(5),
    ]);

    const currentSession = sessionResult.data;
    const history = historyResult.data || [];

    let movements: Awaited<ReturnType<typeof getCashMovements>>['data'] = [];
    let todaySales: any[] = [];

    if (currentSession) {
        const [movementsResult, salesResult] = await Promise.all([
            getCashMovements(currentSession.id),
            getSales({ from: currentSession.opened_at, limit: 100 }),
        ]);
        movements = movementsResult.data || [];
        todaySales = salesResult.data || [];
    }

    const expectedCash = currentSession
        ? currentSession.opening_amount
        + currentSession.total_sales_cash
        + currentSession.total_deposits
        - currentSession.total_withdrawals
        : 0;

    // Desglose por método de pago
    const salesByMethod = todaySales.reduce((acc: Record<string, number>, sale: any) => {
        const method = sale.payment_method;
        acc[method] = (acc[method] || 0) + Number(sale.total_amount);
        return acc;
    }, {});

    const methodLabels: Record<string, { label: string; icon: any; color: string }> = {
        cash: { label: 'Efectivo', icon: Banknote, color: 'text-emerald-600' },
        transfer: { label: 'Transferencia', icon: Building2, color: 'text-blue-600' },
        qr: { label: 'Código QR', icon: Smartphone, color: 'text-indigo-600' },
        debit: { label: 'Débito', icon: CreditCard, color: 'text-purple-600' },
        credit: { label: 'Crédito', icon: CreditCard, color: 'text-orange-600' },
        mixed: { label: 'Otros', icon: ArrowLeftRight, color: 'text-slate-600' },
        account: { label: 'Cuenta Corriente', icon: ArrowLeftRight, color: 'text-amber-600' },
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Control de Caja</h1>
                <p className="text-slate-500">Apertura, cierre y movimientos de efectivo</p>
            </div>

            <CashSessionCard session={currentSession} expectedCash={expectedCash} />

            {currentSession && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <Wallet className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Apertura</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(currentSession.opening_amount)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <ArrowDownCircle className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Ventas Efectivo</p>
                                        <p className="text-xl font-bold text-emerald-600">
                                            +{formatCurrency(currentSession.total_sales_cash)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <ArrowUpCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Retiros/Gastos</p>
                                        <p className="text-xl font-bold text-red-600">
                                            -{formatCurrency(currentSession.total_withdrawals)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Otros medios</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {formatCurrency(currentSession.total_sales_other)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desglose por método de pago */}
                    {Object.keys(salesByMethod).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowLeftRight className="w-5 h-5" />
                                    Desglose por Método de Pago
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {Object.entries(salesByMethod).map(([method, total]) => {
                                        const config = methodLabels[method] || { label: method, icon: Wallet, color: 'text-slate-600' };
                                        const Icon = config.icon;
                                        return (
                                            <div key={method} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                                <Icon className={`w-5 h-5 mx-auto mb-1 ${config.color}`} />
                                                <p className="text-xs text-slate-500 mb-0.5">{config.label}</p>
                                                <p className={`text-sm font-bold ${config.color}`}>{formatCurrency(total)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Movimientos del día */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowLeftRight className="w-5 h-5" />
                                Movimientos del Día
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!movements || movements.length === 0 ? (
                                <p className="text-center py-6 text-slate-500 text-sm">No hay movimientos registrados</p>
                            ) : (
                                <div className="space-y-2">
                                    {movements.map((mov: any) => (
                                        <div key={mov.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mov.type === 'withdrawal' || mov.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {mov.type === 'withdrawal' || mov.type === 'expense'
                                                    ? <ArrowUpCircle className="w-4 h-4" />
                                                    : <ArrowDownCircle className="w-4 h-4" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {mov.description || (mov.type === 'withdrawal' || mov.type === 'expense' ? 'Retiro/Gasto' : 'Ingreso')}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(mov.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                    {mov.creator?.full_name && ` · ${mov.creator.full_name}`}
                                                </p>
                                            </div>
                                            <p className={`font-semibold shrink-0 ${mov.type === 'withdrawal' || mov.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {mov.type === 'withdrawal' || mov.type === 'expense' ? '-' : '+'}{formatCurrency(mov.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Historial de Cierres */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Historial de Cierres
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CashHistoryTable sessions={history} />
                </CardContent>
            </Card>
        </div>
    );
}
