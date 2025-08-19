/**
 * Utility functions for skins payout calculations
 */

/**
 * Round to cents using standard rounding (0.5 rounds up)
 * Avoids floating point precision errors by working in cents
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate skins payouts for a tournament
 */
export function calculateSkinsPayouts(params: {
  potAmount: number; // amount in cents
  totalSkins: number;
  playerSkinCounts: Record<string, number>; // entryId -> skin count
}): {
  payoutPerSkin: number; // dollars
  perPlayerPayouts: Record<string, number>; // entryId -> payout in dollars
} {
  const { potAmount, totalSkins, playerSkinCounts } = params;
  
  if (totalSkins === 0) {
    return {
      payoutPerSkin: 0,
      perPlayerPayouts: Object.keys(playerSkinCounts).reduce((acc, entryId) => {
        acc[entryId] = 0;
        return acc;
      }, {} as Record<string, number>)
    };
  }
  
  // Convert cents to dollars for calculation
  const potInDollars = potAmount / 100;
  const payoutPerSkin = roundToCents(potInDollars / totalSkins);
  
  const perPlayerPayouts: Record<string, number> = {};
  for (const [entryId, skinCount] of Object.entries(playerSkinCounts)) {
    perPlayerPayouts[entryId] = roundToCents(skinCount * payoutPerSkin);
  }
  
  return {
    payoutPerSkin,
    perPlayerPayouts
  };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}