import Link from 'next/link';
import { AlertTriangle, Package, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLowStockProducts } from '@/lib/actions/products';
import { formatQuantity, getStockStatus } from '@/lib/utils';
import type { LowStockProduct } from '@/lib/types';

export default async function StockPage() {
    const { data: lowStockProducts, error } = await getLowStockProducts();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Stock Bajo
                    </h1>
                    <p className="text-slate-500">
                        Productos que necesitan reposición
                    </p>
                </div>
                <Link href="/productos">
                    <Button variant="outline">
                        <Package className="w-5 h-5 mr-2" />
                        Ver Todos los Productos
                    </Button>
                </Link>
            </div>

            {/* Alert Banner */}
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

            {/* Products List */}
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
                            {lowStockProducts.map((product: LowStockProduct) => {
                                const status = getStockStatus(product.stock_on_hand, product.threshold);

                                return (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-4 py-4"
                                    >
                                        {/* Status indicator */}
                                        <div className={`w-3 h-3 rounded-full ${status === 'out' ? 'bg-red-500 animate-pulse' :
                                            status === 'critical' ? 'bg-orange-500' :
                                                'bg-amber-500'
                                            }`} />

                                        {/* Product info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {product.name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Umbral: {formatQuantity(product.threshold, product.unit_type)}
                                            </p>
                                        </div>

                                        {/* Current stock */}
                                        <div className="text-right">
                                            <Badge
                                                variant={
                                                    status === 'out' ? 'danger' :
                                                        status === 'critical' ? 'warning' : 'warning'
                                                }
                                            >
                                                {status === 'out'
                                                    ? 'Sin stock'
                                                    : formatQuantity(product.stock_on_hand, product.unit_type)
                                                }
                                            </Badge>
                                        </div>

                                        {/* Action */}
                                        <Link href={`/productos/${product.id}`}>
                                            <Button variant="ghost" size="sm">
                                                Editar
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                                ¡Todo en orden!
                            </h3>
                            <p>No hay productos con stock bajo</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
