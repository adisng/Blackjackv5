import type { Card, Rank, Suit } from './types'

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
]

export const DEFAULT_DECK_COUNT = 6

let cardCounter = 0

/** Build a shoe of `deckCount` standard 52-card decks. */
export function buildShoe(deckCount: number = DEFAULT_DECK_COUNT): Card[] {
  const shoe: Card[] = []
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cardCounter += 1
        shoe.push({ id: `${rank}-${suit}-${d}-${cardCounter}`, suit, rank })
      }
    }
  }
  return shoe
}

/** Fisher-Yates shuffle (in place, returns the same array). */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function newShuffledShoe(deckCount: number = DEFAULT_DECK_COUNT): Card[] {
  return shuffle(buildShoe(deckCount))
}

/** Reshuffle when the shoe drops below ~25% of its full size. */
export function needsReshuffle(
  shoe: Card[],
  deckCount: number = DEFAULT_DECK_COUNT,
): boolean {
  return shoe.length < deckCount * 52 * 0.25
}
