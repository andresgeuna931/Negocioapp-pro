'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatQuantity, getStockStatus } from '@/lib/utils';
import { getProductById } from '@/lib/actions/products';
import type { LowStockProduct, Product } from '@/lib/types';
import { EditProductModal } from '@/components/stock/edit-product-modal';

interface StockProductRowProps {
    product: LowStockProduct;
    userRole?: string;
}

export function StockProductRow({ product, userRole }: StockProductRowProps) {
    const [fullProduct, setFullProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const status = getStockStatus(product.stock_on_hand, product.threshold);
    const canEdit = userRole !== 'staff';

    const handleEdit = async () => {
        setLoading(true);
        const result = await getProductById(product.id);
        if (result.data) setFullProduct(result.data);
        setLoading(false);
    };

    return (
        <>
            <div className="flex items-center gap-4 py-4">
                <div className={`w-3 h-3 rounded-full ${
                    status === 'out' ? 'bg-red-500 animate-pulse' :
                    status === 'critical' ? 'bg-orange-500' : 'bg-amber-500'
                }`} />

                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                    <p className="text-sm text-slate-500">
                        Umbral: {formatQuantity(product.threshold, product.unit_type)}
                    </p>
                </div>

                <div className="text-right">
                    <Badge variant={status === 'out' ? 'danger' : 'warning'}>
                        {status === 'out' ? 'Sin stock' : formatQuantity(product.stock_on_hand, product.unit_type)}
                    </Badge>
                </div>

                {canEdit && (
                    <Button variant="ghost" size="sm" onClick={handleEdit} loading={loading}>
                        Editar
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </div>

            {fullProduct && (
                <EditProductModal
                    product={fullProduct}
                    onClose={() => setFullProduct(null)}
                />
            )}
        </>
    );
}
