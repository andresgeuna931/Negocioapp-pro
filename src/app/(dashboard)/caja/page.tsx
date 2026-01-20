import { Wallet, Clock, ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentCashSession, getCashMovements, getCashSessionHistory } from '@/lib/actions/cash';
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

    // Get movements if there's an open session
    let movements: Awaited<ReturnType<typeof getCashMovements>>['data'] = [];
    if (currentSession) {
        const movementsResult = await getCashMovements(currentSession.id);
        movements = movementsResult.data || [];
    }

    const expectedCash = currentSession
        ? currentSession.opening_amount
        + currentSession.total_sales_cash
        + currentSession.total_deposits
        - currentSession.total_withdrawals
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Control de Caja
                </h1>
                <p className="text-slate-500">
                    Apertura, cierre y movimientos de efectivo
                </p>
            </div>

            {/* Main Cash Session Card */}
            <CashSessionCard
                session={currentSession}
                expectedCash={expectedCash}
            />

            {/* Stats Cards - Only show if session is open */}
            {currentSession && (
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
            )}

            {/* History Section */}
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
