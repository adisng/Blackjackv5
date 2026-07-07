import type { Card } from './types'

/** Base value of a single card. Ace counts as 11 here; softness handled in handValue. */
export function cardValue(card: Card): number {
  if (card.rank === 'A') return 11
  if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J') return 10
  return parseInt(card.rank, 10)
}

export interface HandValue {
  total: number
  soft: boolean
}

/**
 * Compute hand total. Aces start at 11; while total > 21 and an
 * unconverted Ace remains, convert one Ace to 1.
 */
export function handValue(cards: Card[]): HandValue {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c)
    if (c.rank === 'A') aces += 1
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  // Soft if at least one Ace is still counted as 11
  return { total, soft: aces > 0 }
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21
}

/** Dealer hits on 16 or less and on soft 17; stands on hard 17+. */
export function dealerShouldHit(cards: Card[]): boolean {
  const { total, soft } = handValue(cards)
  if (total < 17) return true
  if (total === 17 && soft) return true
  return false
}

/** Split allowed only on matching ranks of the first two cards. */
export function canSplitHand(cards: Card[]): boolean {
  return cards.length === 2 && cards[0].rank === cards[1].rank
}
