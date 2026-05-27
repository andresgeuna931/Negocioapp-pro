import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getLowStockProducts } from '@/lib/actions/products';
import { StockProductRow } from '@/components/stock/stock-product-row';
import type { LowStockProduct } from '@/lib/types';

export default async function StockPage() {
    const { data: lowStockProducts, error } = await getLowStockProducts();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock Bajo</h1>
                    <p className="text-slate-500">Productos que necesitan reposición</p>
                </div>
                <Link href="/productos">
                    <Button variant="outline">
                        <Package className="w-5 h-5 mr-2" />
                        Ver Todos los Productos
                    </Button>
                </Link>
            </div>

            {lowStockProducts && lowStockProducts.length > 0 && (
                <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                                {lowStockProducts.length} productos con stock bajo
                            </h3>
                            <p className="text-amber-600 dark:text-amber-400 text-sm">
                                Revisá los productos y realizá los pedidos necesarios
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Productos con Stock Crítico
                        </span>
                        <form action="">
                            <Button variant="ghost" size="sm" type="submit">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Actualizar
                            </Button>
                        </form>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-red-500">
                            Error al cargar productos: {error}
                        </div>
                    ) : lowStockProducts && lowStockProducts.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {lowStockProducts.map((product: LowStockProduct) => (
                                <StockProductRow key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">¡Todo en orden!</h3>
                            <p>No hay productos con stock bajo</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
