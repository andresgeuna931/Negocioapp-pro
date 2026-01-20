'use client';

import { useState, useCallback } from 'react';
import { Percent, Upload, Eye, Check, AlertCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
    previewPriceIncrease,
    applyPriceIncrease,
    previewExcelImport,
    applyExcelImport
} from '@/lib/actions/prices';
import * as XLSX from 'xlsx';

interface PriceUpdateFormProps {
    categories: string[];
}

interface PreviewItem {
    id: string;
    name: string;
    category: string | null;
    barcode?: string;
    currentPrice: number;
    newPrice: number;
    increase: number;
}

export function PriceUpdateForm({ categories }: PriceUpdateFormProps) {
    // State for percentage method
    const [percentage, setPercentage] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // State for Excel method
    const [excelData, setExcelData] = useState<{ barcode: string; price: number }[]>([]);
    const [fileName, setFileName] = useState('');

    // Common state
    const [preview, setPreview] = useState<PreviewItem[]>([]);
    const [notFoundBarcodes, setNotFoundBarcodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [activeMethod, setActiveMethod] = useState<'percentage' | 'excel' | null>(null);

    // Handle Excel file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setError('');
        setSuccess('');
        setPreview([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                // Parse data - look for barcode/codigo and price/precio columns
                const items: { barcode: string; price: number }[] = [];

                for (const row of jsonData as Record<string, unknown>[]) {
                    const barcode = String(
                        row['barcode'] || row['Barcode'] ||
                        row['codigo'] || row['Codigo'] ||
                        row['código'] || row['Código'] ||
                        row['code'] || row['Code'] || ''
                    ).trim();

                    const price = Number(
                        row['price'] || row['Price'] ||
                        row['precio'] || row['Precio'] ||
                        row['nuevo_precio'] || row['Nuevo Precio'] || 0
                    );

                    if (barcode && price > 0) {
                        items.push({ barcode, price });
                    }
                }

                if (items.length === 0) {
                    setError('No se encontraron datos válidos. El archivo debe tener columnas "codigo" y "precio".');
                    return;
                }

                setExcelData(items);
                setActiveMethod('excel');
            } catch (err) {
                setError('Error al leer el archivo. Asegurate de que sea un Excel válido.');
            }
        };
        reader.readAsBinaryString(file);
    }, []);

    // Preview percentage increase
    const handlePreviewPercentage = async () => {
        if (!percentage || Number(percentage) === 0) {
            setError('Ingresá un porcentaje válido');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        setActiveMethod('percentage');

        const result = await previewPriceIncrease(
            Number(percentage),
            selectedCategory || undefined
        );

        if (result.error) {
            setError(result.error);
        } else {
            setPreview(result.data || []);
        }
        setLoading(false);
    };

    // Preview Excel import
    const handlePreviewExcel = async () => {
        if (excelData.length === 0) {
            setError('Primero subí un archivo Excel');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        const result = await previewExcelImport(excelData);

        if (result.error) {
            setError(result.error);
        } else if (result.data) {
            setPreview(result.data.matched);
            setNotFoundBarcodes(result.data.notFound);
        }
        setLoading(false);
    };

    // Apply changes
    const handleApply = async () => {
        setApplying(true);
        setError('');

        let result;
        if (activeMethod === 'percentage') {
            result = await applyPriceIncrease(
                Number(percentage),
                selectedCategory || undefined
            );
        } else {
            result = await applyExcelImport(excelData);
        }

        if (result.success) {
            setSuccess(`✓ Se actualizaron ${result.updatedCount} productos`);
            setPreview([]);
            setPercentage('');
            setExcelData([]);
            setFileName('');
            setActiveMethod(null);
        } else {
            setError(result.error || 'Error al aplicar cambios');
        }
        setApplying(false);
    };

    // Reset
    const handleReset = () => {
        setPreview([]);
        setError('');
        setSuccess('');
        setActiveMethod(null);
        setNotFoundBarcodes([]);
    };

    return (
        <div className="space-y-6">
            {/* Success/Error Messages */}
            {success && (
                <div className="p-4 rounded-xl bg-emerald-100 text-emerald-700 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    {success}
                </div>
            )}
            {error && (
                <div className="p-4 rounded-xl bg-red-100 text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Percentage Method */}
                <Card className={activeMethod === 'excel' ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="w-5 h-5" />
                            Aumento Porcentual
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Categoría
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={activeMethod === 'excel'}
                            >
                                <option value="">Todas las categorías</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <Input
                            type="number"
                            label="Porcentaje de aumento"
                            placeholder="ej: 15"
                            value={percentage}
                            onChange={(e) => setPercentage(e.target.value)}
                            icon={<Percent className="w-5 h-5" />}
                            disabled={activeMethod === 'excel'}
                        />

                        <Button
                            onClick={handlePreviewPercentage}
                            disabled={loading || activeMethod === 'excel'}
                            className="w-full"
                            variant="secondary"
                        >
                            {loading && activeMethod === 'percentage' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Eye className="w-4 h-4 mr-2" />
                            )}
                            Ver Preview
                        </Button>
                    </CardContent>
                </Card>

                {/* Excel Method */}
                <Card className={activeMethod === 'percentage' ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Importar desde Excel
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Archivo Excel
                            </label>
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="excel-upload"
                                    disabled={activeMethod === 'percentage'}
                                />
                                <label
                                    htmlFor="excel-upload"
                                    className="cursor-pointer"
                                >
                                    {fileName ? (
                                        <div>
                                            <p className="text-slate-900 dark:text-white font-medium">{fileName}</p>
                                            <p className="text-sm text-slate-500">{excelData.length} productos encontrados</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                            <p className="text-slate-500">Click para seleccionar archivo</p>
                                            <p className="text-xs text-slate-400 mt-1">Columnas: "codigo" y "precio"</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        <Button
                            onClick={handlePreviewExcel}
                            disabled={loading || excelData.length === 0 || activeMethod === 'percentage'}
                            className="w-full"
                            variant="secondary"
                        >
                            {loading && activeMethod === 'excel' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Eye className="w-4 h-4 mr-2" />
                            )}
                            Ver Preview
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Preview Results */}
            {preview.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                            Preview de cambios ({preview.length} productos)
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleReset}>
                                Cancelar
                            </Button>
                            <Button size="sm" onClick={handleApply} loading={applying}>
                                <Check className="w-4 h-4 mr-2" />
                                Aplicar Cambios
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {notFoundBarcodes.length > 0 && (
                            <div className="mb-4 p-3 rounded-lg bg-amber-100 text-amber-700 text-sm">
                                <strong>Códigos no encontrados:</strong> {notFoundBarcodes.slice(0, 5).join(', ')}
                                {notFoundBarcodes.length > 5 && ` y ${notFoundBarcodes.length - 5} más`}
                            </div>
                        )}
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Producto</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Categoría</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Precio Actual</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Precio Nuevo</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Variación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 50).map((item) => (
                                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                                {item.name}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 text-sm">
                                                {item.category || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                                {formatCurrency(item.currentPrice)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(item.newPrice)}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Badge
                                                    variant={item.increase > 0 ? 'danger' : item.increase < 0 ? 'success' : 'default'}
                                                    size="sm"
                                                >
                                                    {item.increase > 0 ? (
                                                        <ArrowUp className="w-3 h-3 mr-1" />
                                                    ) : item.increase < 0 ? (
                                                        <ArrowDown className="w-3 h-3 mr-1" />
                                                    ) : null}
                                                    {item.increase > 0 ? '+' : ''}{item.increase}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {preview.length > 50 && (
                                <p className="text-center text-sm text-slate-500 py-4">
                                    Mostrando 50 de {preview.length} productos
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
