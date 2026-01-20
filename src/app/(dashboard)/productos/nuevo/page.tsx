'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createProduct } from '@/lib/actions/products';
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await createProduct({
                name: formData.get('name') as string,
                barcode: formData.get('barcode') as string || undefined,
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
            {/* Header */}
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

            {/* Form */}
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
                            name="name"
                            label="Nombre del producto *"
                            placeholder="Ej: Coca Cola 500ml"
                            required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                name="barcode"
                                label="Código de barras"
                                placeholder="Ej: 7790895000058"
                            />
                            <Input
                                name="sku"
                                label="SKU"
                                placeholder="Ej: CC500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select
                                name="unit_type"
                                label="Unidad de medida *"
                                options={unitOptions}
                            />
                            <Input
                                name="category"
                                label="Categoría"
                                placeholder="Ej: Bebidas"
                            />
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
