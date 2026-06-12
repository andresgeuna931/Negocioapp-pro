'use client';

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface SaleExportData {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    items_count: number;
    seller_name?: string;
}

export interface ProductExportData {
    name: string;
    sku?: string;
    barcode?: string;
    category?: string;
    price: number;
    cost?: number;
    stock_on_hand: number;
    unit_type: string;
}

export interface TopProductExportData {
    product_name: string;
    total_qty: number;
    total_revenue: number;
    unit_type: string;
}

// Format payment method for display
function formatPaymentMethod(method: string): string {
    const methods: Record<string, string> = {
        cash: 'Efectivo',
        debit: 'Débito',
        credit: 'Crédito',
        transfer: 'Transferencia',
        mixed: 'Mixto',
    };
    return methods[method] || method;
}

function formatPesos(n: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

// Aplica estilo a una celda
function styleCell(ws: XLSX.WorkSheet, cellRef: string, style: any) {
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = style;
}

// Estilos reutilizables
const STYLES = {
    header: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '10B981' } }, // emerald-500
        alignment: { horizontal: 'left', vertical: 'center' },
    },
    subheader: {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '059669' } }, // emerald-600
        alignment: { horizontal: 'left' },
    },
    label: {
        font: { sz: 10, color: { rgb: '374151' } },
        alignment: { horizontal: 'left' },
    },
    value: {
        font: { bold: true, sz: 11, color: { rgb: '065F46' } },
        alignment: { horizontal: 'right' },
    },
    tableHeader: {
        font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1F2937' } },
        alignment: { horizontal: 'center' },
        border: {
            bottom: { style: 'thin', color: { rgb: '10B981' } },
        },
    },
    tableRowEven: {
        fill: { fgColor: { rgb: 'F0FDF4' } },
        font: { sz: 10 },
        alignment: { horizontal: 'left' },
    },
    tableRowOdd: {
        fill: { fgColor: { rgb: 'FFFFFF' } },
        font: { sz: 10 },
        alignment: { horizontal: 'left' },
    },
    tableNumber: {
        font: { bold: true, sz: 10, color: { rgb: '059669' } },
        alignment: { horizontal: 'right' },
    },
    meta: {
        font: { sz: 9, color: { rgb: '9CA3AF' }, italic: true },
    },
};

// Export sales to Excel
export function exportSalesToExcel(
    sales: SaleExportData[],
    period: string = 'Ventas'
) {
    const today = format(new Date(), 'dd-MM-yyyy', { locale: es });

    const data = sales.map((sale, index) => ({
        '#': index + 1,
        'Fecha': format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es }),
        'Hora': format(new Date(sale.created_at), 'HH:mm', { locale: es }),
        'Total': sale.total_amount,
        'Método de Pago': formatPaymentMethod(sale.payment_method),
        'Items': sale.items_count,
        'Vendedor': sale.seller_name || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
        { wch: 5 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 15 },
        { wch: 8 },
        { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, period);

    const filename = `ventas_${today}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// Export products to Excel
export function exportProductsToExcel(products: ProductExportData[]) {
    const today = format(new Date(), 'dd-MM-yyyy', { locale: es });

    const data = products.map((product, index) => ({
        '#': index + 1,
        'Nombre': product.name,
        'SKU': product.sku || '-',
        'Código Barras': product.barcode || '-',
        'Categoría': product.category || '-',
        'Precio': product.price,
        'Costo': product.cost || 0,
        'Stock': product.stock_on_hand,
        'Unidad': product.unit_type,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    const filename = `productos_${today}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// Export top products report to Excel
export function exportTopProductsToExcel(
    products: TopProductExportData[],
    period: string = 'mes'
) {
    const today = format(new Date(), 'dd-MM-yyyy', { locale: es });

    const data = products.map((product, index) => ({
        'Posición': index + 1,
        'Producto': product.product_name,
        'Cantidad Vendida': product.total_qty,
        'Unidad': product.unit_type,
        'Ingresos': product.total_revenue,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 18 },
        { wch: 10 },
        { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Top Productos ${period}`);

    const filename = `top_productos_${period}_${today}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// Export summary report to Excel — con formato y colores
export function exportSummaryToExcel(data: {
    periodLabel: string;
    totalVentas: number;
    cantidadVentas: number;
    ticketPromedio: number;
    variacionPct: number | null;
    inventoryValue: number;
    inventoryCost: number;
    potentialProfit: number;
    topProducts: TopProductExportData[];
}) {
    const today = format(new Date(), 'dd-MM-yyyy', { locale: es });
    const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

    const wb = XLSX.utils.book_new();

    // ─── HOJA RESUMEN ────────────────────────────────────────────────────────
    const summaryRows: any[][] = [
        // Fila 1: título
        ['NegocioApp Pro — Reporte de Ventas', '', ''],
        // Fila 2: período y fecha
        [`Período: ${data.periodLabel}`, '', `Generado: ${now}`],
        ['', '', ''],
        // Ventas
        ['RESUMEN DE VENTAS', '', ''],
        ['Total vendido', '', formatPesos(data.totalVentas)],
        ['Cantidad de ventas', '', data.cantidadVentas],
        ['Ticket promedio', '', formatPesos(data.ticketPromedio)],
        ['vs. período anterior', '', data.variacionPct !== null ? `${data.variacionPct >= 0 ? '↑' : '↓'} ${Math.abs(data.variacionPct).toFixed(0)}%` : 'N/A'],
        ['', '', ''],
        // Inventario
        ['INVENTARIO', '', ''],
        ['Valor al costo', '', formatPesos(data.inventoryCost)],
        ['Valor de venta', '', formatPesos(data.inventoryValue)],
        ['Ganancia potencial', '', formatPesos(data.potentialProfit)],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);

    summaryWs['!cols'] = [{ wch: 28 }, { wch: 4 }, { wch: 22 }];
    summaryWs['!rows'] = [{ hpt: 28 }, { hpt: 16 }];

    // Aplicar estilos
    styleCell(summaryWs, 'A1', STYLES.header);
    styleCell(summaryWs, 'A2', STYLES.meta);
    styleCell(summaryWs, 'C2', STYLES.meta);
    styleCell(summaryWs, 'A4', STYLES.subheader);
    ['A5','A6','A7','A8'].forEach(r => styleCell(summaryWs, r, STYLES.label));
    ['C5','C6','C7','C8'].forEach(r => styleCell(summaryWs, r, STYLES.value));
    styleCell(summaryWs, 'A10', STYLES.subheader);
    ['A11','A12','A13'].forEach(r => styleCell(summaryWs, r, STYLES.label));
    ['C11','C12','C13'].forEach(r => styleCell(summaryWs, r, STYLES.value));

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

    // ─── HOJA TOP PRODUCTOS ───────────────────────────────────────────────────
    if (data.topProducts && data.topProducts.length > 0) {
        const headerRow = ['#', 'Producto', 'Cant. Vendida', 'Ingresos'];
        const productRows = data.topProducts.map((p, i) => [
            i + 1,
            p.product_name,
            p.total_qty,
            formatPesos(p.total_revenue),
        ]);

        const topWs = XLSX.utils.aoa_to_sheet([
            [`Top 10 Productos — ${data.periodLabel}`, '', '', ''],
            ['', '', '', ''],
            headerRow,
            ...productRows,
        ]);

        topWs['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 16 }, { wch: 18 }];
        topWs['!rows'] = [{ hpt: 22 }];

        // Estilos encabezado
        styleCell(topWs, 'A1', STYLES.header);
        ['A3','B3','C3','D3'].forEach(r => styleCell(topWs, r, STYLES.tableHeader));

        // Filas alternadas
        productRows.forEach((_, i) => {
            const row = i + 4;
            const style = i % 2 === 0 ? STYLES.tableRowEven : STYLES.tableRowOdd;
            ['A','B','C'].forEach(col => styleCell(topWs, `${col}${row}`, style));
            styleCell(topWs, `D${row}`, STYLES.tableNumber);
        });

        XLSX.utils.book_append_sheet(wb, topWs, 'Top Productos');
    }

    // ─── DESCARGAR ────────────────────────────────────────────────────────────
    const filename = `reporte_negocio_${today}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
