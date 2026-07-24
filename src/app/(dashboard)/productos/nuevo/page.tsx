'use client';
import { getCurrentSession } from '@/lib/actions/auth';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Save, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scanner } from '@/components/sales/scanner';
import { createProduct, getCategoriesFromTable } from '@/lib/actions/products';
import { formatCurrency } from '@/lib/utils';
import type { UnitType } from '@/lib/types';

const unitOptions = [
    { value: 'unit', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'lt', label: 'Litro (lt)' },
];

const UNIT_LABELS: Record<UnitType, string> = {
    unit: 'unidad',
    kg: 'kg',
    lt: 'lt',
};

export default function NewProductPage() {
    const router = useRouter();

    // F-02: verificar rol al montar — redirigir si es staff
    useEffect(() => {
        getCurrentSession().then(session => {
            if (session?.profile?.role === 'staff') {
                router.replace('/');
            }
        });
    }, [router]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [barcode, setBarcode] = useState('');
    const [unitType, setUnitType] = useState<UnitType>('unit');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const unitLabel = UNIT_LABELS[unitType];
    const priceNum = parseFloat(price) || 0;
    const costNum = parseFloat(cost) || 0;
    const margin = priceNum > 0 && costNum > 0 ? priceNum - costNum : null;
    const marginPct = margin !== null && priceNum > 0 ? ((margin / priceNum) * 100).toFixed(1) : null;

    useEffect(() => {
        getCategoriesFromTable().then(result => {
            if (result.data) setCategories(result.data);
        });
    }, []);

    const handleScan = (scannedCode: string) => {
        setBarcode(scannedCode);
        setShowScanner(false);
        setTimeout(() => { nameInputRef.current?.focus(); }, 100);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        try {
            const result = await createProduct({
                name: formData.get('name') as string,
                barcode: barcode || (formData.get('barcode') as string) || undefined,
                sku: formData.get('sku') as string || undefined,
                unit_type: unitType,
                price: parseFloat(price),
                cost: cost ? parseFloat(cost) : undefined,
                stock_on_hand: parseFloat(formData.get('stock_on_hand') as string) || 0,
                low_stock_threshold_override: formData.get('threshold')
                    ? parseInt(formData.get('threshold') as string)
                    : undefined,
                category: formData.get('category') as string || undefined,
            });
            if (result.error) {
                setError(result.error);
            } else {
                router.push('/productos');
            }
        } catch {
            setError('Error al crear el producto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {showScanner && (
                <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            <div className="flex items-center gap-4">
                <Link href="/productos">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nuevo Producto</h1>
                    <p className="text-slate-500">Agregá un nuevo producto a tu inventario</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Información del Producto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <Input
                            ref={nameInputRef}
                            name="name"
                            label="Nombre del producto *"
                            placeholder="Ej: Coca Cola 500ml"
                            required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Código de barras
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        name="barcode"
                                        placeholder="Ej: 7790895000058"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
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
                                name="sku"
                                label="SKU (opcional)"
                                placeholder="Ej: CC500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select
                                name="unit_type"
                                label="Unidad de medida *"
                                options={unitOptions}
                                value={unitType}
                                onChange={(e) => setUnitType(e.target.value as UnitType)}
                            />
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Categoría
                                </label>
                                <select
                                    name="category"
                                    className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">Sin categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Precio con sufijo de unidad */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Precio de venta * <span className="text-slate-400 font-normal">por {unitLabel}</span>
                                </label>
                                <div className="relative">
                                    <input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        required
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
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
                                        name="cost"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                        className="w-full h-11 pl-4 pr-14 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                                        /{unitLabel}
                                    </span>
                                </div>
                                {margin !== null && marginPct !== null && (
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${margin >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                        <span className="font-medium">Margen: {formatCurrency(margin)} ({marginPct}%)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stock con unidad dinámica */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Stock inicial <span className="text-slate-400 font-normal">({unitLabel})</span>
                                </label>
                                <input
                                    name="stock_on_hand"
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    placeholder={unitType === 'kg' ? 'Ej: 0.500' : unitType === 'lt' ? 'Ej: 1.5' : '0'}
                                    defaultValue="0"
                                    className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <Input
                                name="threshold"
                                type="number"
                                step="1"
                                min="0"
                                label="Alerta stock bajo (opcional)"
                                placeholder="5 (por defecto)"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button type="submit" loading={loading} className="flex-1">
                                <Save className="w-5 h-5 mr-2" />
                                Guardar Producto
                            </Button>
                            <Link href="/productos" className="flex-1">
                                <Button type="button" variant="outline" className="w-full">
                                    Cancelar
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
