// Adjustment reasons for inventory
export type AdjustmentReason =
    | 'damaged'
    | 'expired'
    | 'theft'
    | 'count_error'
    | 'stock_entry'
    | 'purchase_not_registered'
    | 'other';

export const ADJUSTMENT_REASONS: Record<AdjustmentReason, string> = {
    stock_entry: 'Ingreso de mercadería',
    count_error: 'Error en conteo anterior',
    purchase_not_registered: 'Compra no registrada',
    damaged: 'Producto dañado',
    expired: 'Producto vencido',
    theft: 'Robo/Faltante',
    other: 'Otro',
};
