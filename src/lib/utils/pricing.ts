// Utility functions for price calculations
// These are client-side utilities, not server actions

export type AdjustmentType = 'percentage' | 'fixed';

/**
 * Calculate the adjusted price based on a base price and adjustment settings
 * @param basePrice - The original price
 * @param adjustmentType - 'percentage' or 'fixed'
 * @param adjustmentValue - The adjustment value (e.g., 5 for +5% or 50 for +$50)
 * @returns The adjusted price
 */
export function calculateAdjustedPrice(
    basePrice: number,
    adjustmentType: AdjustmentType,
    adjustmentValue: number
): number {
    if (adjustmentType === 'percentage') {
        return Math.round(basePrice * (1 + adjustmentValue / 100) * 100) / 100;
    }
    return basePrice + adjustmentValue;
}

/**
 * Format an adjustment for display
 * @param adjustmentType - 'percentage' or 'fixed'
 * @param adjustmentValue - The adjustment value
 * @returns Formatted string like "+5%" or "+$50"
 */
export function formatAdjustment(
    adjustmentType: AdjustmentType,
    adjustmentValue: number
): string {
    if (adjustmentValue === 0) return 'Precio base';
    const sign = adjustmentValue > 0 ? '+' : '';
    if (adjustmentType === 'percentage') {
        return `${sign}${adjustmentValue}%`;
    }
    return `${sign}$${adjustmentValue}`;
}
