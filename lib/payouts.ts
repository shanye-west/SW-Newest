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

  // If there are no skins to pay out, return zeros for each player
  if (totalSkins === 0) {
    return {
      payoutPerSkin: 0,
      perPlayerPayouts: Object.keys(playerSkinCounts).reduce((acc, entryId) => {
        acc[entryId] = 0;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Work entirely in integer cents
  const payoutPerSkinCents = Math.floor(potAmount / totalSkins);

  const perPlayerPayoutsCents: Record<string, number> = {};
  let allocated = 0;
  for (const [entryId, skinCount] of Object.entries(playerSkinCounts)) {
    const payout = skinCount * payoutPerSkinCents;
    perPlayerPayoutsCents[entryId] = payout;
    allocated += payout;
  }

  // Distribute any remainder cents to players with the most skins
  let remainder = potAmount - allocated;
  if (remainder > 0) {
    const sortedEntries = Object.entries(playerSkinCounts)
      .filter(([, skins]) => skins > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    let i = 0;
    while (remainder > 0 && sortedEntries.length > 0) {
      const entryId = sortedEntries[i % sortedEntries.length][0];
      perPlayerPayoutsCents[entryId] += 1; // add 1 cent
      remainder--;
      i++;
    }
  }

  // Convert back to dollars for return values
  const payoutPerSkin = payoutPerSkinCents / 100;
  const perPlayerPayouts: Record<string, number> = {};
  for (const [entryId, cents] of Object.entries(perPlayerPayoutsCents)) {
    perPlayerPayouts[entryId] = cents / 100;
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