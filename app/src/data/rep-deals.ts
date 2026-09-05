// Candidate open deals for the rep's Simulator. The question the screen answers:
// "which deal should I close first to maximise my commission?" Each deal carries a
// base commission rate and a product multiplier; the model adds an attainment
// accelerator so deals that push you into a higher tier pay more per dollar.

export interface Deal {
  id: string
  account: string
  product: string
  amount: number
  currency: string
  baseRatePct: number
  productMultiplier: number
  closeProbability: number // 0..1
  closeBy: string
}

export const REP_DEALS: Deal[] = [
  { id: 'd-1', account: 'Northwind Utilities', product: 'Fleet Charging Suite', amount: 220000, currency: 'USD', baseRatePct: 3.5, productMultiplier: 1.25, closeProbability: 0.75, closeBy: '2026-02-24' },
  { id: 'd-2', account: 'Cascade Transit', product: 'DC Fast Network', amount: 145000, currency: 'USD', baseRatePct: 3.0, productMultiplier: 1.5, closeProbability: 0.6, closeBy: '2026-02-27' },
  { id: 'd-3', account: 'Harbor Logistics', product: 'Depot Expansion', amount: 96000, currency: 'USD', baseRatePct: 4.0, productMultiplier: 1.0, closeProbability: 0.85, closeBy: '2026-02-20' },
  { id: 'd-4', account: 'Summit Retail Group', product: 'Workplace Charging', amount: 64000, currency: 'USD', baseRatePct: 3.5, productMultiplier: 0.75, closeProbability: 0.9, closeBy: '2026-02-18' },
  { id: 'd-5', account: 'Meridian Health', product: 'Fleet Charging Suite', amount: 180000, currency: 'USD', baseRatePct: 3.0, productMultiplier: 1.25, closeProbability: 0.5, closeBy: '2026-03-02' },
  { id: 'd-6', account: 'Aurora Municipality', product: 'Public Network', amount: 128000, currency: 'USD', baseRatePct: 4.5, productMultiplier: 1.0, closeProbability: 0.65, closeBy: '2026-02-26' },
]

// Attainment accelerator: crossing 100% attainment kicks the marginal rate up.
export interface RankedDeal extends Deal {
  grossCommission: number
  expectedCommission: number
  acceleratorPct: number
}

/**
 * @param ytdAttainmentPct where the rep sits today (drives the accelerator)
 */
export function rankDeals(deals: Deal[], ytdAttainmentPct: number): RankedDeal[] {
  return deals
    .map((d) => {
      // Above plan → 1.15x kicker; near plan (>=85%) → 1.05x; else flat.
      const acceleratorPct = ytdAttainmentPct >= 100 ? 15 : ytdAttainmentPct >= 85 ? 5 : 0
      const effectiveRate = (d.baseRatePct / 100) * d.productMultiplier * (1 + acceleratorPct / 100)
      const grossCommission = d.amount * effectiveRate
      return {
        ...d,
        acceleratorPct,
        grossCommission,
        expectedCommission: grossCommission * d.closeProbability,
      }
    })
    .sort((a, b) => b.expectedCommission - a.expectedCommission)
}
