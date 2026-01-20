'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Check, AlertTriangle, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatQuantity } from '@/lib/utils';
import { getProductsForCount, applyInventoryAdjustments } from '@/lib/actions/inventory';
import { ADJUSTMENT_REASONS, type AdjustmentReason } from '@/lib/constants/adjustment-reasons';
import { useRouter } from 'next/navigation';

interface CountedProduct {
    id: string;
    name: string;
    barcode: string | null;
    unit_type: string;
    category: string | null;
    systemStock: number;
    countedStock: number | null;
    reason: AdjustmentReason;
    notes: string;
}

export function InventoryCountForm() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<CountedProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Load products
    const loadProducts = async (searchTerm?: string) => {
        setLoading(true);
        const result = await getProductsForCount(searchTerm);
        if (result.data) {
            setProducts(result.data.map(p => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                unit_type: p.unit_type,
                category: p.category,
                systemStock: Number(p.stock_on_hand),
                countedStock: null,
                reason: 'count_error' as AdjustmentReason,
                notes: '',
            })));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProducts();
    }, []);

    // Handle search
    const handleSearch = () => {
        loadProducts(search || undefined);
    };

    // Update counted stock for a product
    const updateCount = (productId: string, value: string) => {
        const numValue = value === '' ? null : parseFloat(value);
        setProducts(prev => prev.map(p =>
            p.id === productId
                ? { ...p, countedStock: numValue }
                : p
        ));
    };

    // Update reason for a product
    const updateReason = (productId: string, reason: AdjustmentReason) => {
        setProducts(prev => prev.map(p =>
            p.id === productId
                ? { ...p, reason }
                : p
        ));
    };

    // Get products with differences
    const productsWithDifference = products.filter(p =>
        p.countedStock !== null && p.countedStock !== p.systemStock
    );

    // Apply adjustments
    const handleApply = async () => {
        if (productsWithDifference.length === 0) {
            setError('No hay diferencias para ajustar');
            return;
        }

        setApplying(true);
        setError('');

        const adjustments = productsWithDifference.map(p => ({
            productId: p.id,
            productName: p.name,
            currentStock: p.systemStock,
            countedStock: p.countedStock!,
            difference: p.countedStock! - p.systemStock,
            reason: p.reason,
            notes: p.notes || undefined,
        }));

        const result = await applyInventoryAdjustments(adjustments);

        if (result.success) {
            setSuccess(`✓ Se ajustaron ${result.adjustedCount} productos`);
            // Reload products
            await loadProducts(search || undefined);
        } else {
            setError(result.error || 'Error al aplicar ajustes');
        }
        setApplying(false);
    };

    // Clear all counts
    const handleClear = () => {
        setProducts(prev => prev.map(p => ({
            ...p,
            countedStock: null,
            notes: '',
        })));
        setSuccess('');
        setError('');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Conteo de Inventario
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Success/Error Messages */}
                {success && (
                    <div className="p-4 rounded-xl bg-emerald-100 text-emerald-700 flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="p-4 rounded-xl bg-red-100 text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Search */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            icon={<Search className="w-5 h-5" />}
                        />
                    </div>
                    <Button onClick={handleSearch} variant="secondary">
                        Buscar
                    </Button>
                </div>

                {/* Products Table */}
                {loading ? (
                    <div className="py-12 text-center">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Producto</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Stock Sistema</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-500 w-32">Contado</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Diferencia</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => {
                                    const diff = product.countedStock !== null
                                        ? product.countedStock - product.systemStock
                                        : null;
                                    const hasDiff = diff !== null && diff !== 0;

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`border-b border-slate-100 dark:border-slate-800 ${hasDiff ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                                        >
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {product.name}
                                                    </p>
                                                    {product.barcode && (
                                                        <p className="text-xs text-slate-400 font-mono">
                                                            {product.barcode}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                                                {formatQuantity(product.systemStock, product.unit_type)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    step={product.unit_type === 'kg' || product.unit_type === 'lt' ? '0.1' : '1'}
                                                    value={product.countedStock ?? ''}
                                                    onChange={(e) => updateCount(product.id, e.target.value)}
                                                    placeholder="—"
                                                    className="w-full px-3 py-2 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {diff !== null ? (
                                                    <Badge
                                                        variant={diff === 0 ? 'success' : diff > 0 ? 'info' : 'danger'}
                                                        size="sm"
                                                    >
                                                        {diff > 0 ? '+' : ''}{formatQuantity(diff, product.unit_type)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {hasDiff && (
                                                    <select
                                                        value={product.reason}
                                                        onChange={(e) => updateReason(product.id, e.target.value as AdjustmentReason)}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                                    >
                                                        {Object.entries(ADJUSTMENT_REASONS).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-500">
                        {productsWithDifference.length > 0 ? (
                            <span className="text-amber-600 font-medium">
                                ⚠️ {productsWithDifference.length} producto(s) con diferencias
                            </span>
                        ) : (
                            <span>Ingresá las cantidades contadas</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClear}>
                            <X className="w-4 h-4 mr-2" />
                            Limpiar
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={productsWithDifference.length === 0 || applying}
                            loading={applying}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Aplicar Ajustes ({productsWithDifference.length})
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
