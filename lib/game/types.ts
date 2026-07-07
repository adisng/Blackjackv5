export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
}

export type GamePhase =
  | 'IDLE'
  | 'BETTING'
  | 'DEALING'
  | 'PLAYER_TURN'
  | 'DEALER_TURN'
  | 'RESULT'

export type HandOutcome =
  | 'blackjack'
  | 'win'
  | 'push'
  | 'lose'
  | 'bust'

export interface PlayerHand {
  cards: Card[]
  bet: number
  doubled: boolean
  stood: boolean
  busted: boolean
  fromSplit: boolean
  outcome: HandOutcome | null
}

export type DealerMoment =
  | 'deal'
  | 'playerBlackjack'
  | 'dealerBust'
  | 'playerBust'
  | 'push'
  | 'bigWin'
  | 'win'
  | 'lose'

export interface DealerPersona {
  id: string
  name: string
  tagline: string
  accent: string
  portraitBg: string
  portraitFg: string
  lines: Record<DealerMoment, string[]>
}
