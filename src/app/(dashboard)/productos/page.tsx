import Link from 'next/link';
import { Plus, Search, Package, Edit2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProducts, getCategories } from '@/lib/actions/products';
import { formatCurrency, formatQuantity, getStockStatus } from '@/lib/utils';
import { ProductSearch } from '@/components/products/product-search';

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; category?: string }>;
}) {
    const params = await searchParams;
    const { data: products } = await getProducts({
        search: params.search,
        category: params.category,
        activeOnly: true,
    });
    const { data: categories } = await getCategories();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Productos
                    </h1>
                    <p className="text-slate-500">
                        {products?.length || 0} productos activos
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/productos/precios">
                        <Button variant="secondary" className="w-full sm:w-auto">
                            <DollarSign className="w-5 h-5 mr-2" />
                            Actualizar Precios
                        </Button>
                    </Link>
                    <Link href="/productos/nuevo">
                        <Button className="w-full sm:w-auto">
                            <Plus className="w-5 h-5 mr-2" />
                            Nuevo Producto
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search and Filters */}
            <ProductSearch categories={categories || []} />

            {/* Products Grid */}
            {products && products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((product) => {
                        const status = getStockStatus(
                            product.stock_on_hand,
                            product.low_stock_threshold_override || 5
                        );

                        return (
                            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                                <CardContent className="p-4">
                                    {/* Product Image Placeholder */}
                                    <div className="aspect-square rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mb-4 relative overflow-hidden">
                                        <Package className="w-12 h-12 text-slate-400" />

                                        {/* Edit button on hover */}
                                        <Link
                                            href={`/productos/${product.id}`}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                                                <Edit2 className="w-5 h-5 text-slate-700" />
                                            </div>
                                        </Link>

                                        {/* Stock badge */}
                                        <Badge
                                            variant={
                                                status === 'ok' ? 'success' :
                                                    status === 'low' ? 'warning' :
                                                        status === 'critical' ? 'warning' : 'danger'
                                            }
                                            className="absolute top-2 right-2"
                                            size="sm"
                                        >
                                            {formatQuantity(product.stock_on_hand, product.unit_type)}
                                        </Badge>
                                    </div>

                                    {/* Product Info */}
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white truncate">
                                            {product.name}
                                        </p>
                                        {product.barcode && (
                                            <p className="text-xs text-slate-400 mt-0.5 font-mono">
                                                {product.barcode}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-lg font-bold text-emerald-600">
                                                {formatCurrency(product.price)}
                                            </p>
                                            {product.category && (
                                                <Badge variant="default" size="sm">
                                                    {product.category}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                            No hay productos
                        </h3>
                        <p className="text-slate-500 mb-4">
                            {params.search
                                ? 'No se encontraron productos con esa búsqueda'
                                : 'Agregá tu primer producto para empezar'}
                        </p>
                        <Link href="/productos/nuevo">
                            <Button>
                                <Plus className="w-5 h-5 mr-2" />
                                Agregar Producto
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
