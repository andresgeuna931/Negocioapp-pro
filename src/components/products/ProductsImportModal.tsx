'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { importProducts } from '@/lib/actions/products';

export function ProductsImportModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<{ created: number; updated: number; errors: string[] | null } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                Nombre: 'Ejemplo: Coca Cola 1.5L',
                CodigoBarra: '7791234567890',
                SKU: 'COCA-15',
                PrecioVenta: 2500,
                Costo: 1800,
                Stock: 24,
                Categoria: 'Bebidas',
                Unidad: 'unit'
            },
            {
                Nombre: 'Ejemplo: Papas (Kilo)',
                CodigoBarra: '',
                SKU: 'PAPAS-N',
                PrecioVenta: 1200,
                Costo: 800,
                Stock: 50,
                Categoria: 'Verdulería',
                Unidad: 'kg'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "plantilla_productos_negocioapp.xlsx");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setSummary(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (jsonData.length === 0) {
                toast.error('El archivo está vacío');
                setLoading(false);
                return;
            }

            // Map Excel columns to our schema
            const productsToImport = jsonData.map(row => ({
                name: String(row.Nombre || row.nombre || ''),
                barcode: row.CodigoBarra ? String(row.CodigoBarra) : undefined,
                sku: row.SKU ? String(row.SKU) : undefined,
                price: Number(row.PrecioVenta || row.precio || 0),
                cost: Number(row.Costo || row.costo || 0),
                stock_on_hand: Number(row.Stock || row.stock || 0),
                category: String(row.Categoria || row.categoria || 'General'),
                unit_type: (row.Unidad === 'kg' || row.Unidad === 'g' || row.Unidad === 'lt' || row.Unidad === 'ml')
                    ? row.Unidad
                    : 'unit' as any
            })).filter(p => p.name && p.price >= 0); // Basic validation

            if (productsToImport.length === 0) {
                toast.error('No se encontraron productos válidos en el archivo');
                setLoading(false);
                return;
            }

            toast.info(`Procesando ${productsToImport.length} productos...`);

            const result = await importProducts(productsToImport);

            if (result.success) {
                setSummary({
                    created: result.created || 0,
                    updated: result.updated || 0,
                    errors: result.errors || null
                });
                toast.success('Importación completada');
                router.refresh();
                // Clear input
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                toast.error('Error en la importación: ' + result.error);
            }

        } catch (error) {
            console.error('Error parsing file:', error);
            toast.error('Error al procesar el archivo Excel');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed">
                    <FileSpreadsheet className="w-4 h-4" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importación Masiva de Productos</DialogTitle>
                    <DialogDescription>
                        Carga o actualiza tu inventario subiendo un archivo Excel (.xlsx).
                    </DialogDescription>
                </DialogHeader>

                {!summary ? (
                    <div className="space-y-6 py-4">
                        {/* Step 1: Download Template */}
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs">1</span>
                                Descargar Plantilla
                            </h4>
                            <p className="text-sm text-slate-500 mb-3 ml-8">
                                Usa nuestro formato estándar para evitar errores.
                            </p>
                            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate} className="ml-8 w-fit">
                                <Download className="w-4 h-4 mr-2" />
                                Descargar .xlsx
                            </Button>
                        </div>

                        {/* Step 2: Upload File */}
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs">2</span>
                                Subir Archivo
                            </h4>
                            <div className="ml-8 mt-2">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {loading ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                                                <p className="text-sm text-slate-500">Procesando...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                <p className="text-sm text-slate-500">
                                                    <span className="font-semibold">Clic para subir</span> o arrastrar
                                                </p>
                                                <p className="text-xs text-slate-400">XLSX o CSV</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={loading}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                ¡Importación Finalizada!
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-center">
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {summary.created}
                                </p>
                                <p className="text-xs text-emerald-600/80 uppercase font-semibold">Nuevos</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-center">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {summary.updated}
                                </p>
                                <p className="text-xs text-blue-600/80 uppercase font-semibold">Actualizados</p>
                            </div>
                        </div>

                        {summary.errors && summary.errors.length > 0 && (
                            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Errores ({summary.errors.length})
                                </h4>
                                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 max-h-32 overflow-y-auto">
                                    {summary.errors.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <Button onClick={() => setOpen(false)} className="w-full">
                            Entendido
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
