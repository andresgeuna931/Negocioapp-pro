import { redirect } from 'next/navigation';
import { getCurrentSession, getTenantSettings, getSubscriptionStatus } from '@/lib/actions/auth';
import { getSalesSummary, getTopProducts } from '@/lib/actions/reports';
import { getLowStockProducts } from '@/lib/actions/products';
import { getExpensesSummary } from '@/lib/actions/expenses';
import { PLANS } from '@/lib/config/plans';
import type { LowStockProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { verifyMercadoPagoPayment } from '@/lib/actions/checkout';

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const paymentId = searchParams?.payment_id as string;
  if (paymentId) {
    await verifyMercadoPagoPayment(paymentId);
  }

  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const [todaySummary, monthSummary, topProducts, lowStock, tenant, subscriptionResult, expensesSummary] = await Promise.all([
    getSalesSummary('today'),
    getSalesSummary('month'),
    getTopProducts(5, 'month'),
    getLowStockProducts(),
    getTenantSettings(),
    getSubscriptionStatus(),
    getExpensesSummary('month'),
  ]);

  const subscription = subscriptionResult?.subscription;
  const isAdmin = session.profile.role === 'admin';

  const monthIncome = monthSummary.data?.total_amount || 0;
  const monthExpenses = expensesSummary.total || 0;
  const monthProfit = monthIncome - monthExpenses;

  let planName = 'Pendiente de Pago';
  let isInTrial = false;
  let trialDaysLeft = 0;

  const isActive = tenant?.status === 'active';

  if (isActive || (subscription && subscription.status === 'active')) {
    isInTrial = false;
    const settings = tenant?.settings as any;
    let planKey: string = (settings?.plan_id || tenant?.plan_type || subscription?.plan || 'starter').toUpperCase();
    if (planKey === 'BASIC') planKey = 'STARTER';
    if (planKey === 'PREMIUM') planKey = 'PROFESSIONAL';
    const finalPlanKey = (planKey as keyof typeof PLANS) in PLANS ? (planKey as keyof typeof PLANS) : 'STARTER';
    planName = PLANS[finalPlanKey]?.name || 'Profesional';
  } else {
    const createdAt = new Date(tenant?.created_at || new Date());
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    const now = new Date();
    if (now < trialEndDate) {
      isInTrial = true;
      trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      planName = 'Prueba Gratis';
    } else {
      planName = 'Suscripción Necesaria';
    }
  }

  return (
    <div className="space-y-6">
      {isInTrial && trialDaysLeft > 0 && (
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Te quedan {trialDaysLeft} días de prueba gratis</p>
                  <p className="text-sm text-blue-100">Estás usando el Plan Profesional completo. ¡Aprovechalo!</p>
                </div>
              </div>
              <Link href="/precios" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                Ver Planes
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            ¡Hola, {session.profile.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <Badge variant={isInTrial ? 'info' : tenant?.plan_type === 'business' ? 'success' : tenant?.plan_type === 'professional' ? 'info' : 'success'}>
            Plan {planName}
          </Badge>
        </div>
        <p className="text-slate-500 dark:text-slate-400">Bienvenido a {session.tenant.name}</p>
        {subscription?.current_period_end && !isAdmin && (
          <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5 font-medium">
            Próximo pago:{' '}
            {new Date(subscription.current_period_end).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'America/Argentina/Buenos_Aires'
            })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ventas Hoy</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(todaySummary.data?.total_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ventas Hoy</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{todaySummary.data?.total_sales || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Este Mes</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(monthIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Stock Bajo</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{lowStock.data?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos del mes</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(monthIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gastos del mes</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(monthExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={monthProfit >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${monthProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <DollarSign className={`w-5 h-5 ${monthProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ganancia del mes</p>
                <p className={`text-lg font-bold ${monthProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(monthProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">{index + 1}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{product.product_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(product.total_revenue)}</p>
                    <p className="text-xs text-slate-500">{formatQuantity(product.total_qty, product.unit_type)} vendidos</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-4">No hay ventas este mes</p>
          )}
        </CardContent>
      </Card>

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
                  <span className="text-sm text-slate-700 dark:text-slate-300">{product.name}</span>
                  <Badge variant="warning">{formatQuantity(product.stock_on_hand, product.unit_type)}</Badge>
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
