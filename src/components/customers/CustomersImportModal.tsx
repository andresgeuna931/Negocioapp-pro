'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, Users } from 'lucide-react';
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
import { importCustomers } from '@/lib/actions/customers';

export function CustomersImportModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<{ created: number; errors: string[] | null } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                NombreCompleto: 'Juan Perez',
                DNI: '12345678',
                Email: 'juan@email.com',
                Telefono: '1155556666',
                Direccion: 'Calle Falsa 123',
                LimiteFiado: 50000,
                SaldoInicial: 0
            },
            {
                NombreCompleto: 'Maria Garcia (Debe)',
                DNI: '87654321',
                Email: '',
                Telefono: '',
                Direccion: '',
                LimiteFiado: 100000,
                SaldoInicial: 3500 // Ya debe 3500
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        XLSX.writeFile(wb, "plantilla_clientes_negocioapp.xlsx");
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
            const customersToImport = jsonData.map(row => ({
                full_name: String(row.NombreCompleto || row.nombre || ''),
                dni: row.DNI ? String(row.DNI) : undefined,
                email: row.Email ? String(row.Email) : undefined,
                phone: row.Telefono ? String(row.Telefono) : undefined,
                address: row.Direccion ? String(row.Direccion) : undefined,
                credit_limit: Number(row.LimiteFiado || 0),
                initial_balance: Number(row.SaldoInicial || 0)
            })).filter(c => c.full_name);

            if (customersToImport.length === 0) {
                toast.error('No se encontraron clientes válidos (Nombre es requerido)');
                setLoading(false);
                return;
            }

            toast.info(`Procesando ${customersToImport.length} clientes...`);

            const result = await importCustomers(customersToImport);

            if (result.success) {
                setSummary({
                    created: result.created || 0,
                    errors: result.errors
                });
                toast.success('Importación completada');
                router.refresh();
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
                    <Users className="w-4 h-4" />
                    Importar Clientes
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importación Masiva de Clientes</DialogTitle>
                    <DialogDescription>
                        Carga tu base de clientes y sus saldos iniciales (deudas) desde Excel.
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
                                Incluye columnas para Nombre, DNI y <b>Saldo Inicial (Deuda)</b>.
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

                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-center">
                            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                                {summary.created}
                            </p>
                            <p className="text-sm text-emerald-600/80 uppercase font-semibold mt-1">Clientes Nuevos</p>
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
