'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    exportSummaryToExcel,
    type TopProductExportData
} from '@/lib/utils/export-excel';

interface ExportButtonsProps {
    todayTotal: number;
    todaySales: number;
    monthTotal: number;
    monthSales: number;
    averageTicket: number;
    inventoryValue: number;
    inventoryCost: number;
    potentialProfit: number;
    topProducts: TopProductExportData[];
}

export function ExportButtons({
    todayTotal,
    todaySales,
    monthTotal,
    monthSales,
    averageTicket,
    inventoryValue,
    inventoryCost,
    potentialProfit,
    topProducts,
}: ExportButtonsProps) {
    const [loading, setLoading] = useState(false);

    const handleExportExcel = () => {
        setLoading(true);
        try {
            exportSummaryToExcel({
                todayTotal,
                todaySales,
                monthTotal,
                monthSales,
                averageTicket,
                inventoryValue,
                inventoryCost,
                potentialProfit,
                topProducts,
            });
        } catch (error) {
            console.error('Error exporting:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                Exportar Excel
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
            >
                <Download className="w-4 h-4 mr-2" />
                Imprimir / PDF
            </Button>
        </div>
    );
}
