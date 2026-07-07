import type { DealerPersona } from './types'

export const DEALERS: DealerPersona[] = [
  {
    id: 'veteran',
    glb: undefined,
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
    glb: '/models/tung-sahur.glb',
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
  {
    id: 'brr-patapim',
    glb: '/models/brr-patapim.glb',
    name: 'Brr Brr Patapim',
    tagline: 'Chaotic energy. Unpredictable. Somehow always wins.',
    accent: '#5B8CFF',
    portraitBg: '#0a0e1c',
    portraitFg: '#5B8CFF',
    lines: {
      deal: [
        'Brr brr. Cards are out.',
        'Patapim. The shoe has spoken.',
        'Brr brr brr. Play your hand.',
      ],
      playerBlackjack: [
        'PATAPIM! Twenty-one! The chaos rewards you!',
        'Brr brr brr... blackjack. Even I am impressed.',
      ],
      dealerBust: [
        'Brr brr... I busted. The patapim backfired.',
        'Too many. You are paid. Brr.',
      ],
      playerBust: [
        'Patapim. Over twenty-one. Brr brr.',
        'The chaos took you. Better luck next hand.',
        'Brr brr brr. That is a bust.',
      ],
      push: ['Brr. A tie. The patapim is neutral.', 'Push. We reset the chaos.'],
      bigWin: [
        'MASSIVE PATAPIM. The table shakes!',
        'Brr brr brr brr. A legendary hand.',
      ],
      win: ['Your hand. Brr brr.', 'Patapim of victory. Take your chips.'],
      lose: ['The house patapims last.', 'Brr brr. Lost. The chaos is mine.'],
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
