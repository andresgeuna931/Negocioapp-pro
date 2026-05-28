'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Scanner } from '@/components/sales/scanner';
import { updateProduct, getCategoriesFromTable } from '@/lib/actions/products';
import { formatCurrency } from '@/lib/utils';
import type { Product, UnitType } from '@/lib/types';

const unitOptions = [
    { value: 'unit', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'lt', label: 'Litro (lt)' },
];

const unitLabels: Record<string, string> = {
    unit: 'unidad', kg: 'kg', lt: 'lt',
};

export function EditProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

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

    useEffect(() => {
        getCategoriesFromTable().then(result => {
            if (result.data) setCategories(result.data);
        });
    }, []);

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
                onClose();
                router.refresh();
            }
        } catch {
            setError('Error al actualizar el producto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showScanner && (
                <Scanner onScan={(code) => { setBarcode(code); setShowScanner(false); }} onClose={() => setShowScanner(false)} />
            )}

            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Editar Producto</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <Input label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} required />

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Código de barras</label>
                                <div className="flex gap-2">
                                    <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Ej: 779089..." className="flex-1" />
                                    <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)} className="shrink-0 h-11 w-11">
                                        <ScanLine className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                            <Input label="SKU (opcional)" value={sku} onChange={(e) => setSku(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Unidad" value={unitType} onChange={(e) => setUnitType(e.target.value as UnitType)} options={unitOptions} />
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Precio * <span className="text-slate-400 font-normal">por {unitLabel}</span>
                                </label>
                                <div className="relative">
                                    <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                                        className="w-full h-11 pl-4 pr-14 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">/{unitLabel}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Costo <span className="text-slate-400 font-normal">(opcional)</span>
                                </label>
                                <div className="relative">
                                    <input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)}
                                        className="w-full h-11 pl-4 pr-14 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">/{unitLabel}</span>
                                </div>
                                {margin !== null && marginPct !== null && (
                                    <div className={`px-3 py-1.5 rounded-lg text-sm ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        <span className="font-medium">Margen: {formatCurrency(margin)} ({marginPct}%)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Stock actual <span className="text-slate-400 font-normal">({unitLabel})</span>
                                </label>
                                <input type="number" step="0.001" min="0" value={stockOnHand} onChange={(e) => setStockOnHand(e.target.value)}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <Input label="Alerta stock bajo" type="number" step="1" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="5 (por defecto)" />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                        <Button className="flex-1" onClick={handleSave} loading={loading}>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
