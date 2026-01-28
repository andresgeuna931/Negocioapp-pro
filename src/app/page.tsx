import { redirect } from 'next/navigation';
import { getCurrentSession, getTenantSettings } from '@/lib/actions/auth';
import { getSalesSummary, getTopProducts } from '@/lib/actions/reports';
import { getLowStockProducts } from '@/lib/actions/products';
import { PLANS } from '@/lib/config/plans';
import type { LowStockProduct } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch dashboard data
  const [todaySummary, monthSummary, topProducts, lowStock, tenant] = await Promise.all([
    getSalesSummary('today'),
    getSalesSummary('month'),
    getTopProducts(5, 'month'),
    getLowStockProducts(),
    getTenantSettings()
  ]);

  const planName = PLANS[tenant?.plan_type?.toUpperCase() as keyof typeof PLANS]?.name || 'Gratis';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            ¡Hola, {session.profile.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <Badge variant={tenant?.plan_type === 'business' ? 'success' : tenant?.plan_type === 'professional' ? 'info' : 'default'}>
            Plan {planName}
          </Badge>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Bienvenido a {session.tenant.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ventas Hoy</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(todaySummary.data?.total_amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transacciones Hoy */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ventas Hoy</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {todaySummary.data?.total_sales || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ventas Mes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Este Mes</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(monthSummary.data?.total_amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Stock Bajo</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {lowStock.data?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/ventas">
          <Card className="hover:border-emerald-500 transition-colors cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">Nueva Venta</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/productos">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">Productos</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Top Productos del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.data && topProducts.data.length > 0 ? (
            <div className="space-y-3">
              {topProducts.data.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {product.product_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {formatCurrency(product.total_revenue)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatQuantity(product.total_qty, product.unit_type)} vendidos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-4">
              No hay ventas este mes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStock.data && lowStock.data.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.data.slice(0, 5).map((product: LowStockProduct) => (
                <div key={product.id} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {product.name}
                  </span>
                  <Badge variant="warning">
                    {formatQuantity(product.stock_on_hand, product.unit_type)}
                  </Badge>
                </div>
              ))}
            </div>
            {lowStock.data.length > 5 && (
              <Link href="/stock" className="block mt-3 text-center text-sm text-amber-600 hover:underline">
                Ver todos ({lowStock.data.length})
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
