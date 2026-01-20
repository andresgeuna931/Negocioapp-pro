// Adjustment reasons for inventory
export type AdjustmentReason =
    | 'damaged'
    | 'expired'
    | 'theft'
    | 'count_error'
    | 'purchase_not_registered'
    | 'other';

export const ADJUSTMENT_REASONS: Record<AdjustmentReason, string> = {
    damaged: 'Producto dañado',
    expired: 'Producto vencido',
    theft: 'Robo/Faltante',
    count_error: 'Error en conteo anterior',
    purchase_not_registered: 'Compra no registrada',
    other: 'Otro',
};
