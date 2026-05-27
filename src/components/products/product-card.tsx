'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Save, Trash2, Eye, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Scanner } from '@/components/sales/scanner';
import { updateProduct, deleteProduct, getCategoriesFromTable } from '@/lib/actions/products';
import { formatCurrency, formatQuantity, getStockStatus } from '@/lib/utils';
import type { Product, UnitType } from '@/lib/types';

const unitOptions = [
    { value: 'unit', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'lt', label: 'Litro (lt)' },
];

const unitLabels: Record<string, string> = {
    unit: 'unidad',
    kg: 'kg',
    lt: 'lt',
};

interface ProductCardProps {
    product: Product;
    canEdit?: boolean;
}

export function ProductCard({ product, canEdit = true }: ProductCardProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    // Form state
    const [name, setName] = useState(product.name);
    const [barcode, setBarcode] = useState(product.barcode || '');
    const [sku, setSku] = useState(product.sku || '');
    const [unitType, setUnitType] = useState<UnitType>(product.unit_type);
    const [category, setCategory] = useState(product.category || '');
    const [price, setPrice] = useState(product.price.toString());
    const [cost, setCost] = useState(product.cost?.toString() || '');
    const [stockOnHand, setStockOnHand] = useState(product.stock_on_hand.toString());
    const [threshold, setThreshold] = useState(product.low_stock_threshold_override?.toString() || '');

    const unitLabel = unitLabels[unitType] || 'unidad';
    const priceNum = parseFloat(price) || 0;
    const costNum = parseFloat(cost) || 0;
    const margin = priceNum > 0 && costNum > 0 ? priceNum - costNum : null;
    const marginPct = margin !== null && priceNum > 0 ? ((margin / priceNum) * 100).toFixed(1) : null;

    const status = getStockStatus(
        product.stock_on_hand,
        product.low_stock_threshold_override || 5
    );

    useEffect(() => {
        if (open) {
            getCategoriesFromTable().then(result => {
                if (result.data) setCategories(result.data);
            });
        }
    }, [open]);

    const handleScan = (scannedCode: string) => {
        setBarcode(scannedCode);
        setShowScanner(false);
    };

    const handleSave = async () => {
        setError('');
        setLoading(true);
        try {
            const result = await updateProduct(product.id, {
                name,
                barcode: barcode || undefined,
                sku: sku || undefined,
                unit_type: unitType,
                category: category || undefined,
                price: parseFloat(price),
                cost: cost ? parseFloat(cost) : undefined,
                stock_on_hand: parseFloat(stockOnHand),
                low_stock_threshold_override: threshold ? parseFloat(threshold) : undefined,
            });
            if (result.error) {
                setError(result.error);
            } else {
                setOpen(false);
                router.refresh();
            }
        } catch {
            setError('Error al actualizar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const result = await deleteProduct(product.id);
            if (result.error) {
                setError(result.error);
                setShowDeleteConfirm(false);
            } else {
                setOpen(false);
                router.refresh();
            }
        } catch {
            setError('Error al eliminar el producto');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <Card
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setOpen(true)}
            >
                <CardContent className="p-4">
                    <div className="aspect-square rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-4 relative overflow-hidden">
                        <Package className="w-12 h-12 text-slate-400" />
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

            {/* Scanner fuera del Dialog para evitar conflictos de z-index */}
            {showScanner && (
                <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {canEdit ? 'Editar Producto' : (
                                <>
                                    <Eye className="w-5 h-5 text-slate-400" />
                                    Detalle del Producto
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {canEdit ? (
                        <div className="space-y-4">
                            <Input
                                label="Nombre *"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />

                            {/* Código de barras con scanner */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Código de barras
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            placeholder="Ej: 779089..."
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowScanner(true)}
                                            title="Escanear código"
                                            className="shrink-0 h-11 w-11"
                                        >
                                            <ScanLine className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    label="SKU (opcional)"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                />
                            </div>

                            {/* Unidad y Categoría */}
                            <div className="grid grid-cols-2 gap-3">
                                <Select
                                    label="Unidad"
                                    value={unitType}
                                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                                    options={unitOptions}
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Categoría
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">Sin categoría</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Precio con sufijo unidad */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Precio * <span className="text-slate-400 font-normal">por {unitLabel}</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            required
                                            className="w-full h-11 pl-4 pr-14 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                                            /{unitLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* Costo con margen */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Costo <span className="text-slate-400 font-normal">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={cost}
                                            onChange={(e) => setCost(e.target.value)}
                                            className="w-full h-11 pl-4 pr-14 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                                            /{unitLabel}
                                        </span>
                                    </div>
                                    {margin !== null && marginPct !== null && (
                                        <div className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${margin >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                            <span className="font-medium">Margen: {formatCurrency(margin)} ({marginPct}%)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stock con unidad dinámica */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Stock actual <span className="text-slate-400 font-normal">({unitLabel})</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={stockOnHand}
                                        onChange={(e) => setStockOnHand(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <Input
                                    label="Alerta stock bajo"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={threshold}
                                    onChange={(e) => setThreshold(e.target.value)}
                                    placeholder="Por defecto"
                                />
                            </div>
                        </div>
                    ) : (
                        /* READ-ONLY MODE */
                        <div className="space-y-4">
                            <DetailRow label="Nombre" value={product.name} />
                            <div className="grid grid-cols-2 gap-3">
                                <DetailRow label="Código de barras" value={product.barcode || '—'} />
                                <DetailRow label="SKU" value={product.sku || '—'} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailRow label="Unidad" value={unitLabels[product.unit_type] || product.unit_type} />
                                <DetailRow label="Categoría" value={product.category || '—'} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailRow label="Precio" value={formatCurrency(product.price)} highlight />
                                <DetailRow label="Costo" value={product.cost ? formatCurrency(product.cost) : '—'} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailRow label="Stock actual" value={formatQuantity(product.stock_on_hand, product.unit_type)} />
                                <DetailRow label="Alerta stock bajo" value={product.low_stock_threshold_override?.toString() || 'Por defecto'} />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                        {canEdit && !showDeleteConfirm ? (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                </Button>
                                <div className="flex-1" />
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave} loading={loading}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar
                                </Button>
                            </>
                        ) : canEdit && showDeleteConfirm ? (
                            <div className="w-full space-y-3">
                                <p className="text-sm text-center text-red-600">
                                    ¿Seguro que querés eliminar este producto?
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleDelete}
                                        loading={deleting}
                                        className="flex-1 bg-red-500 text-white hover:bg-red-600 border-0"
                                    >
                                        Sí, eliminar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="w-full"
                            >
                                Cerrar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
            <p className={`text-sm font-medium ${highlight ? 'text-emerald-600 text-base' : 'text-slate-900 dark:text-white'}`}>
                {value}
            </p>
        </div>
    );
}
