import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calculateSuccessProbability(data: {
  organizationType: string
  fundingAmount: number
  experienceLevel: string
  hasPartnership: boolean
  hasPreviousGrants: boolean
}): number {
  let score = 50 // Base score

  // Organization type multiplier
  const orgMultipliers: Record<string, number> = {
    'nonprofit': 1.2,
    'university': 1.15,
    'startup': 0.9,
    'corporation': 0.8,
    'individual': 0.7
  }
  score *= orgMultipliers[data.organizationType] || 1

  // Funding amount impact (sweet spot around $50K-$500K)
  if (data.fundingAmount >= 50000 && data.fundingAmount <= 500000) {
    score *= 1.1
  } else if (data.fundingAmount > 1000000) {
    score *= 0.8
  }

  // Experience boost
  if (data.experienceLevel === 'expert') score += 15
  else if (data.experienceLevel === 'intermediate') score += 5

  // Partnership and previous grants
  if (data.hasPartnership) score += 10
  if (data.hasPreviousGrants) score += 15

  // Cap at 95% to maintain realism
  return Math.min(95, Math.max(5, Math.round(score)))
}