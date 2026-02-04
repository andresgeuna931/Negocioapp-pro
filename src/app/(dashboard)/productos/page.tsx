import Link from 'next/link';
import { Plus, Package, DollarSign, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getProducts, getCategories } from '@/lib/actions/products';
import { getCurrentSession } from '@/lib/actions/auth';
import { ProductSearch } from '@/components/products/product-search';
import { ProductsImportModal } from '@/components/products/ProductsImportModal';
import { ProductCard } from '@/components/products/product-card';
import { hasPermission } from '@/lib/permissions';

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; category?: string }>;
}) {
    const params = await searchParams;
    const session = await getCurrentSession();
    const canEdit = session ? hasPermission(session.profile.role, 'products:edit') : false;
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
                    {canEdit ? (
                        <>
                            <ProductsImportModal />
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
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Lock className="w-4 h-4" />
                            Solo el dueño puede editar productos
                        </div>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <ProductSearch categories={categories || []} />

            {/* Products Grid */}
            {products && products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
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
