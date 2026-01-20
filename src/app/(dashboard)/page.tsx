import {
    TrendingUp,
    ShoppingCart,
    DollarSign,
    Package,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDashboardData } from '@/lib/actions/reports';
import { formatCurrency, formatQuantity, getStockStatus } from '@/lib/utils';

export default async function DashboardPage() {
    const data = await getDashboardData();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-slate-500">
                        Resumen de tu negocio
                    </p>
                </div>
                <Link href="/ventas">
                    <Button size="lg" className="w-full sm:w-auto">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Nueva Venta
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today Sales */}
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Ventas Hoy</p>
                                <p className="text-3xl font-bold mt-1">
                                    {formatCurrency(data.today?.total_amount || 0)}
                                </p>
                                <p className="text-emerald-100 text-sm mt-1">
                                    {data.today?.total_sales || 0} ventas
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Month Sales */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Ventas del Mes</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                    {formatCurrency(data.month?.total_amount || 0)}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm text-emerald-600">{data.month?.total_sales || 0} ventas</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Average Sale */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Ticket Promedio</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                    {formatCurrency(data.today?.average_sale || 0)}
                                </p>
                                <p className="text-slate-500 text-sm mt-1">hoy</p>
                            </div>
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Low Stock Alert */}
                <Card className={data.lowStock && data.lowStock.length > 0 ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800' : ''}>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Stock Bajo</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                    {data.lowStock?.length || 0}
                                </p>
                                <p className="text-slate-500 text-sm mt-1">productos</p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.lowStock && data.lowStock.length > 0
                                    ? 'bg-amber-200 dark:bg-amber-800'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}>
                                <AlertTriangle className={`w-6 h-6 ${data.lowStock && data.lowStock.length > 0
                                        ? 'text-amber-600'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Productos Más Vendidos</CardTitle>
                        <Badge variant="info">Este mes</Badge>
                    </CardHeader>
                    <CardContent>
                        {data.topProducts && data.topProducts.length > 0 ? (
                            <div className="space-y-4">
                                {data.topProducts.map((product, index) => (
                                    <div key={product.product_id} className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                                index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">
                                                {product.product_name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {formatQuantity(product.total_qty, product.unit_type)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(product.total_revenue)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No hay ventas este mes</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Low Stock Products */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Stock Crítico</CardTitle>
                        <Link href="/stock">
                            <Button variant="ghost" size="sm">
                                Ver todos
                                <ArrowUpRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {data.lowStock && data.lowStock.length > 0 ? (
                            <div className="space-y-3">
                                {data.lowStock.slice(0, 5).map((product) => {
                                    const status = getStockStatus(product.stock_on_hand, product.threshold);
                                    return (
                                        <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                            <div className={`w-2 h-2 rounded-full ${status === 'out' ? 'bg-red-500' :
                                                    status === 'critical' ? 'bg-orange-500' :
                                                        'bg-amber-500'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                                    {product.name}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={status === 'out' ? 'danger' : status === 'critical' ? 'warning' : 'warning'}
                                                size="sm"
                                            >
                                                {formatQuantity(product.stock_on_hand, product.unit_type)}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Todo el stock está bien 👍</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
