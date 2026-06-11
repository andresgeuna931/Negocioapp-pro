import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInventoryValue } from '@/lib/actions/reports';
import { formatCurrency } from '@/lib/utils';
import { ExportButtons } from '@/components/reports/export-buttons';
import { ReportsClient } from '@/components/reports/reports-client';

export default async function ReportsPage() {
    const inventory = await getInventoryValue();

    const exportData = {
        todayTotal: 0,
        todaySales: 0,
        monthTotal: 0,
        monthSales: 0,
        averageTicket: 0,
        inventoryValue: inventory.data?.valueAtPrice || 0,
        inventoryCost: inventory.data?.valueAtCost || 0,
        potentialProfit: inventory.data?.potentialProfit || 0,
        topProducts: [],
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Reportes
                    </h1>
                    <p className="text-slate-500">
                        Estadísticas y métricas de tu negocio
                    </p>
                </div>
                <ExportButtons {...exportData} />
            </div>

            {/* Selector de período + cards + gráfico + top productos */}
            <ReportsClient inventoryData={inventory.data} />

            {/* Inventory Summary — estático, no cambia con el período */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Resumen de Inventario
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                            <p className="text-sm text-slate-500 mb-1">Valor al Costo</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(inventory.data?.valueAtCost || 0)}
                            </p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                            <p className="text-sm text-slate-500 mb-1">Valor de Venta</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(inventory.data?.valueAtPrice || 0)}
                            </p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                            <p className="text-sm text-emerald-600 mb-1">Ganancia Potencial</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(inventory.data?.potentialProfit || 0)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
