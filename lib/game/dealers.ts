import type { DealerPersona } from './types'

export const DEALERS: DealerPersona[] = [
  {
    id: 'veteran',
    name: 'The Veteran',
    tagline: 'Thirty years on the felt. Nothing surprises him.',
    accent: '#C9A227',
    portraitBg: '#1a1610',
    portraitFg: '#C9A227',
    lines: {
      deal: [
        'Cards are out. Play them well.',
        'Same felt, new hand.',
        'The shoe decides. I just deal.',
      ],
      playerBlackjack: [
        'Clean twenty-one. Textbook.',
        "That's how it's done. Three to two.",
      ],
      dealerBust: [
        'House pays. It happens.',
        'Even the house stumbles.',
      ],
      playerBust: [
        "Cards don't lie. People do.",
        'One over. That is all it takes.',
        'Greed is expensive at this table.',
      ],
      push: ['A push. Nobody bleeds.', 'Even money, even ground.'],
      bigWin: ['A serious hand. Well played.', 'The table remembers nights like this.'],
      win: ['Your hand. Take it.', 'Well played.'],
      lose: ['The house holds. Next hand.', 'Close. Not close enough.'],
    },
  },
  {
    id: 'tung-sahur',
    name: 'Tung Tung Tung Sahur',
    tagline: 'Wakes the table for suhoor. Bats included.',
    accent: '#C96A2A',
    portraitBg: '#1c120a',
    portraitFg: '#E09A5A',
    lines: {
      deal: [
        'Tung. Tung. Tung. Cards.',
        'The drum has spoken. Deal begins.',
        'Wake up. The shoe is awake too.',
      ],
      playerBlackjack: [
        'TWENTY-ONE. THE BAT APPROVES.',
        'Tung tung tung... jackpot. The drum sings for you.',
      ],
      dealerBust: [
        'The house sleeps through its own alarm. You are paid.',
        'Bust. Even the bat cannot save me.',
      ],
      playerBust: [
        'Tung. Tung. Tung. That was your wake-up call.',
        'Over twenty-one. The bat remembers.',
        'You did not answer the third tung.',
      ],
      push: ['A tie. The drum beats for no one.', 'Push. We nap and try again.'],
      bigWin: [
        'A MIGHTY TUNG. The whole street heard that win.',
        'The bat bows. Rare. Cherish it.',
      ],
      win: ['Your hand. The drum approves.', 'Tung of victory. Take your chips.'],
      lose: ['The house tungs last.', 'Lost. Listen closer next time.'],
    },
  },
]

export const DEFAULT_DEALER_ID = 'veteran'

export function getDealer(id: string): DealerPersona {
  return DEALERS.find((d) => d.id === id) ?? DEALERS[0]
}

export function pickLine(dealer: DealerPersona, moment: keyof DealerPersona['lines']): string {
  const lines = dealer.lines[moment]
  return lines[Math.floor(Math.random() * lines.length)]
}
