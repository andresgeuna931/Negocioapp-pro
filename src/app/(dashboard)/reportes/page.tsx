import { BarChart3, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { getSalesSummary, getTopProducts, getInventoryValue, getSalesHistory } from '@/lib/actions/reports';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { ExportButtons } from '@/components/reports/export-buttons';
import { SalesChart } from '@/components/reports/sales-chart';

export default async function ReportsPage() {
    const [todaySummary, monthSummary, topProducts, inventory, history] = await Promise.all([
        getSalesSummary('today'),
        getSalesSummary('month'),
        getTopProducts(10, 'month'),
        getInventoryValue(),
        getSalesHistory(30),
    ]);

    // Prepare data for export
    const exportData = {
        todayTotal: todaySummary.data?.total_amount || 0,
        todaySales: todaySummary.data?.total_sales || 0,
        monthTotal: monthSummary.data?.total_amount || 0,
        monthSales: monthSummary.data?.total_sales || 0,
        averageTicket: monthSummary.data?.average_sale || 0,
        inventoryValue: inventory.data?.valueAtPrice || 0,
        inventoryCost: inventory.data?.valueAtCost || 0,
        potentialProfit: inventory.data?.potentialProfit || 0,
        topProducts: topProducts.data || [],
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Ventas Hoy</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(todaySummary.data?.total_amount || 0)}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {todaySummary.data?.total_sales || 0} ventas
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Ventas del Mes</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(monthSummary.data?.total_amount || 0)}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {monthSummary.data?.total_sales || 0} ventas
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Ticket Promedio</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(monthSummary.data?.average_sale || 0)}
                                </p>
                                <p className="text-xs text-slate-400">este mes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Package className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Valor Inventario</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(inventory.data?.valueAtPrice || 0)}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {inventory.data?.totalProducts || 0} productos
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <SalesChart data={history} />
            </div>

            {/* Top Products */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Top 10 Productos del Mes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {topProducts.data && topProducts.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">#</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Producto</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Cant. Vendida</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Ingresos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.data.map((product, index) => (
                                        <tr
                                            key={product.product_id}
                                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={index < 3 ? 'success' : 'default'}
                                                    size="sm"
                                                >
                                                    {index + 1}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                                {product.product_name}
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                                {formatQuantity(product.total_qty, product.unit_type)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                                {formatCurrency(product.total_revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No hay datos de ventas para mostrar</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Inventory Summary */}
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
