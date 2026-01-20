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

// Export sales to Excel
export function exportSalesToExcel(
    sales: SaleExportData[],
    period: string = 'Ventas'
) {
    const today = format(new Date(), 'dd-MM-yyyy', { locale: es });

    // Transform data for Excel
    const data = sales.map((sale, index) => ({
        '#': index + 1,
        'Fecha': format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es }),
        'Hora': format(new Date(sale.created_at), 'HH:mm', { locale: es }),
        'Total': sale.total_amount,
        'Método de Pago': formatPaymentMethod(sale.payment_method),
        'Items': sale.items_count,
        'Vendedor': sale.seller_name || '-',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Add column widths
    ws['!cols'] = [
        { wch: 5 },  // #
        { wch: 12 }, // Fecha
        { wch: 8 },  // Hora
        { wch: 12 }, // Total
        { wch: 15 }, // Método
        { wch: 8 },  // Items
        { wch: 15 }, // Vendedor
    ];

    XLSX.utils.book_append_sheet(wb, ws, period);

    // Generate and download
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
        { wch: 5 },  // #
        { wch: 30 }, // Nombre
        { wch: 12 }, // SKU
        { wch: 15 }, // Código
        { wch: 15 }, // Categoría
        { wch: 12 }, // Precio
        { wch: 12 }, // Costo
        { wch: 10 }, // Stock
        { wch: 10 }, // Unidad
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
        { wch: 10 }, // Posición
        { wch: 30 }, // Producto
        { wch: 18 }, // Cantidad
        { wch: 10 }, // Unidad
        { wch: 15 }, // Ingresos
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Top Productos ${period}`);

    const filename = `top_productos_${period}_${today}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// Export summary report to Excel
export function exportSummaryToExcel(data: {
    todayTotal: number;
    todaySales: number;
    monthTotal: number;
    monthSales: number;
    averageTicket: number;
    inventoryValue: number;
    inventoryCost: number;
    potentialProfit: number;
    topProducts: TopProductExportData[];
}) {
    const today = format(new Date(), 'dd-MM-yyyy', { locale: es });
    const monthName = format(new Date(), 'MMMM yyyy', { locale: es });

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
        ['RESUMEN DE NEGOCIO', ''],
        ['Fecha del reporte', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })],
        ['', ''],
        ['VENTAS DE HOY', ''],
        ['Total vendido', data.todayTotal],
        ['Cantidad de ventas', data.todaySales],
        ['', ''],
        ['VENTAS DEL MES', ''],
        ['Total vendido', data.monthTotal],
        ['Cantidad de ventas', data.monthSales],
        ['Ticket promedio', data.averageTicket],
        ['', ''],
        ['INVENTARIO', ''],
        ['Valor al costo', data.inventoryCost],
        ['Valor de venta', data.inventoryValue],
        ['Ganancia potencial', data.potentialProfit],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

    // Top products sheet
    if (data.topProducts && data.topProducts.length > 0) {
        const topData = data.topProducts.map((p, i) => ({
            'Pos': i + 1,
            'Producto': p.product_name,
            'Cantidad': p.total_qty,
            'Ingresos': p.total_revenue,
        }));
        const topWs = XLSX.utils.json_to_sheet(topData);
        topWs['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, topWs, 'Top Productos');
    }

    // Generate filename without special characters
    const filename = `reporte_negocio_${today}.xlsx`;

    // Use Blob method for explicit filename control
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
