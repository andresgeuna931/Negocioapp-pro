'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSalesSummaryByRange, getTopProductsByRange, getSalesByDateRange } from '@/lib/actions/reports';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { SalesChart } from '@/components/reports/sales-chart';
import { exportSummaryToExcel } from '@/lib/utils/export-excel';

type PeriodMode = 'last30' | 'thisMonth' | 'prevMonth' | 'custom';

interface DateRange {
    fromISO: string;
    toISO: string;
    label: string;
    chartType: 'area' | 'bar';
}

function computeDateRange(mode: PeriodMode, customYear: number, customMonth: number): DateRange {
    const now = new Date();

    if (mode === 'last30') {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        return {
            fromISO: from.toISOString(),
            toISO: now.toISOString(),
            label: 'Últimos 30 días',
            chartType: 'area',
        };
    }

    if (mode === 'thisMonth') {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const label = from.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        return {
            fromISO: from.toISOString(),
            toISO: to.toISOString(),
            label: label.charAt(0).toUpperCase() + label.slice(1),
            chartType: 'bar',
        };
    }

    if (mode === 'prevMonth') {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const label = from.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        return {
            fromISO: from.toISOString(),
            toISO: to.toISOString(),
            label: label.charAt(0).toUpperCase() + label.slice(1),
            chartType: 'bar',
        };
    }

    // custom
    const from = new Date(customYear, customMonth, 1);
    const to = new Date(customYear, customMonth + 1, 0, 23, 59, 59);
    const label = from.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return {
        fromISO: from.toISOString(),
        toISO: to.toISOString(),
        label: label.charAt(0).toUpperCase() + label.slice(1),
        chartType: 'bar',
    };
}

function fillDays(
    data: { date: string; total: number; count: number }[],
    fromISO: string,
    toISO: string
) {
    const filled = [];
    const current = new Date(fromISO);
    current.setHours(0, 0, 0, 0);
    const end = new Date(toISO);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const existing = data.find(item => item.date === dateStr);
        filled.push({ date: dateStr, total: existing?.total ?? 0, count: existing?.count ?? 0 });
        current.setDate(current.getDate() + 1);
    }
    return filled;
}

interface ReportsClientProps {
    inventoryData: {
        totalProducts: number;
        valueAtCost: number;
        valueAtPrice: number;
        potentialProfit: number;
    } | null;
}

export function ReportsClient({ inventoryData }: ReportsClientProps) {
    const now = new Date();
    const [mode, setMode] = useState<PeriodMode>('last30');
    const [customYear, setCustomYear] = useState(now.getFullYear());
    const [customMonth, setCustomMonth] = useState(now.getMonth());
    const [loading, setLoading] = useState(true);
    const [loadingExport, setLoadingExport] = useState(false);

    const [summary, setSummary] = useState({ total_sales: 0, total_amount: 0, average_sale: 0 });
    const [prevSummary, setPrevSummary] = useState({ total_amount: 0 });
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [chartData, setChartData] = useState<{ date: string; total: number; count: number }[]>([]);

    // Calcular fechas solo cuando cambia mode/customYear/customMonth
    const { fromISO, toISO, label, chartType } = useMemo(
        () => computeDateRange(mode, customYear, customMonth),
        [mode, customYear, customMonth]
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const diffMs = new Date(toISO).getTime() - new Date(fromISO).getTime();
            const prevTo = new Date(new Date(fromISO).getTime() - 1);
            const prevFrom = new Date(prevTo.getTime() - diffMs);

            const [summaryRes, prevRes, topRes, histRes] = await Promise.all([
                getSalesSummaryByRange(fromISO, toISO),
                getSalesSummaryByRange(prevFrom.toISOString(), prevTo.toISOString()),
                getTopProductsByRange(10, fromISO, toISO),
                getSalesByDateRange(fromISO, toISO),
            ]);

            setSummary({
                total_sales: summaryRes.data?.total_sales ?? 0,
                total_amount: summaryRes.data?.total_amount ?? 0,
                average_sale: summaryRes.data?.average_sale ?? 0,
            });
            setPrevSummary({ total_amount: prevRes.data?.total_amount ?? 0 });
            setTopProducts(topRes.data ?? []);
            setChartData(fillDays(histRes.data ?? [], fromISO, toISO));
        } catch (e) {
            console.error('Error cargando datos:', e);
        } finally {
            setLoading(false);
        }
    }, [fromISO, toISO]);

    useEffect(() => { loadData(); }, [loadData]);

    const variacion = prevSummary.total_amount > 0
        ? ((summary.total_amount - prevSummary.total_amount) / prevSummary.total_amount) * 100
        : null;

    const handlePrevMonth = () => {
        setMode('custom');
        if (customMonth === 0) { setCustomMonth(11); setCustomYear(y => y - 1); }
        else setCustomMonth(m => m - 1);
    };

    const handleNextMonth = () => {
        const n = new Date();
        if (customYear === n.getFullYear() && customMonth === n.getMonth()) return;
        setMode('custom');
        if (customMonth === 11) { setCustomMonth(0); setCustomYear(y => y + 1); }
        else setCustomMonth(m => m + 1);
    };

    const handleExport = () => {
        setLoadingExport(true);
        try {
            exportSummaryToExcel({
                periodLabel: label,
                totalVentas: summary.total_amount,
                cantidadVentas: summary.total_sales,
                ticketPromedio: summary.average_sale,
                variacionPct: variacion,
                inventoryValue: inventoryData?.valueAtPrice ?? 0,
                inventoryCost: inventoryData?.valueAtCost ?? 0,
                potentialProfit: inventoryData?.potentialProfit ?? 0,
                topProducts: topProducts.map(p => ({
                    product_name: p.product_name,
                    total_qty: p.total_qty,
                    total_revenue: p.total_revenue,
                    unit_type: p.unit_type || 'unit',
                })),
            });
        } catch (e) {
            console.error('Error exportando:', e);
        } finally {
            setLoadingExport(false);
        }
    };

    const handlePrint = () => { window.print(); };

    return (
        <div className="space-y-6">
            {/* Selector de período */}
            <div className="flex flex-wrap items-center gap-2">
                {(['last30', 'thisMonth', 'prevMonth'] as PeriodMode[]).map((m) => {
                    const labels: Record<string, string> = {
                        last30: 'Últimos 30 días',
                        thisMonth: 'Este mes',
                        prevMonth: 'Mes anterior',
                    };
                    return (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                mode === m
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {labels[m]}
                        </button>
                    );
                })}

                {/* Navegador de mes */}
                <div className="flex items-center gap-1 ml-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 min-w-[140px] text-center">
                        {mode === 'custom' ? label : ''}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
            </div>

            {/* Botones exportar */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={handleExport}
                    disabled={loadingExport || loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                    {loadingExport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Exportar Excel
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir / PDF
                </button>
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
                                <p className="text-sm text-slate-500">Ventas del período</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {loading ? '...' : formatCurrency(summary.total_amount)}
                                </p>
                                <p className="text-xs text-slate-400">{summary.total_sales} ventas</p>
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
                                    {loading ? '...' : formatCurrency(summary.average_sale)}
                                </p>
                                <p className="text-xs text-slate-400">este período</p>
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
                                <p className="text-sm text-slate-500">vs. período anterior</p>
                                <p className={`text-2xl font-bold ${
                                    variacion === null
                                        ? 'text-slate-400'
                                        : variacion >= 0
                                            ? 'text-emerald-600'
                                            : 'text-red-500'
                                }`}>
                                    {loading
                                        ? '...'
                                        : variacion === null
                                            ? 'N/A'
                                            : `${variacion >= 0 ? '↑' : '↓'} ${Math.abs(variacion).toFixed(0)}%`
                                    }
                                </p>
                                <p className="text-xs text-slate-400">
                                    {loading ? '' : `${formatCurrency(prevSummary.total_amount)} anterior`}
                                </p>
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
                                    {formatCurrency(inventoryData?.valueAtPrice ?? 0)}
                                </p>
                                <p className="text-xs text-slate-400">{inventoryData?.totalProducts ?? 0} productos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <SalesChart
                        data={chartData}
                        title={`Historial de Ventas — ${label}`}
                        chartType={chartType}
                    />
                </div>
            )}

            {/* Top Products */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Top 10 Productos — {label}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!loading && topProducts.length > 0 ? (
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
                                    {topProducts.map((product, index) => (
                                        <tr
                                            key={product.product_id}
                                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <td className="py-3 px-4">
                                                <Badge variant={index < 3 ? 'success' : 'default'} size="sm">
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
                            <p>{loading ? 'Cargando...' : 'No hay datos de ventas para mostrar'}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
