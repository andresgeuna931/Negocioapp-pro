'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Save, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scanner } from '@/components/sales/scanner';
import { createProduct, getCategories } from '@/lib/actions/products';
import type { UnitType } from '@/lib/types';

const unitOptions = [
    { value: 'unit', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'g', label: 'Gramo (g)' },
    { value: 'lt', label: 'Litro (lt)' },
    { value: 'ml', label: 'Mililitro (ml)' },
];

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [barcode, setBarcode] = useState('');
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getCategories().then(({ data }) => {
            if (data) setCategories(data);
        });
    }, []);

    const handleScan = (scannedCode: string) => {
        setBarcode(scannedCode);
        setShowScanner(false);
        setTimeout(() => {
            nameInputRef.current?.focus();
        }, 100);
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
                unit_type: formData.get('unit_type') as UnitType,
                price: parseFloat(formData.get('price') as string),
                cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : undefined,
                stock_on_hand: parseFloat(formData.get('stock_on_hand') as string) || 0,
                low_stock_threshold_override: formData.get('threshold')
                    ? parseFloat(formData.get('threshold') as string)
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Nuevo Producto
                    </h1>
                    <p className="text-slate-500">
                        Agregá un nuevo producto a tu inventario
                    </p>
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
                            />
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Categoría
                                </label>
                                <select
                                    name="category"
                                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">Sin categoría</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                name="price"
                                type="number"
                                step="0.01"
                                min="0"
                                label="Precio de venta *"
                                placeholder="0.00"
                                required
                            />
                            <Input
                                name="cost"
                                type="number"
                                step="0.01"
                                min="0"
                                label="Costo (opcional)"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                name="stock_on_hand"
                                type="number"
                                step="0.001"
                                min="0"
                                label="Stock inicial"
                                placeholder="0"
                                defaultValue="0"
                            />
                            <Input
                                name="threshold"
                                type="number"
                                step="0.01"
                                min="0"
                                label="Alerta stock bajo (opcional)"
                                placeholder="Usar valor por defecto"
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
