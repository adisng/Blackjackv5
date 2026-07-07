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
    id: 'newcomer',
    name: 'The Newcomer',
    tagline: 'First year on the job. Still roots for the players.',
    accent: '#4A8FB5',
    portraitBg: '#101720',
    portraitFg: '#7FB8D6',
    lines: {
      deal: [
        'Good luck — I mean it.',
        'Here we go. Fingers crossed.',
        'Fresh cards, fresh chances.',
      ],
      playerBlackjack: [
        'Blackjack! That is amazing!',
        'Twenty-one on the deal — incredible.',
      ],
      dealerBust: [
        'I busted — honestly, good for you.',
        'Over twenty-one. Your win!',
      ],
      playerBust: [
        'Oh no... just over. Next one is yours.',
        'So close. Do not let it rattle you.',
      ],
      push: ['A tie! At least you keep your chips.', 'Push — no harm done.'],
      bigWin: ['Look at that stack! Well earned.', 'That was fantastic to watch.'],
      win: ['You won! Nicely played.', 'Your hand takes it!'],
      lose: ['House takes it... sorry.', 'Not this time. Stay with it.'],
    },
  },
  {
    id: 'enforcer',
    name: 'The Enforcer',
    tagline: 'Deals fast. Talks less.',
    accent: '#B3382C',
    portraitBg: '#1a0f0d',
    portraitFg: '#D06A5F',
    lines: {
      deal: ['Cards out.', 'Play.', 'Your move.'],
      playerBlackjack: ['Twenty-one. Paid.', 'Blackjack. Noted.'],
      dealerBust: ['House breaks.', 'Bust. You are paid.'],
      playerBust: ['Over. Bet stays.', 'Bust.', 'Done.'],
      push: ['Push.', 'Even.'],
      bigWin: ['Big hand. Do not get comfortable.', 'Paid in full.'],
      win: ['Your hand.', 'Paid.'],
      lose: ['House wins.', 'Bet lost.'],
    },
  },
  {
    id: 'charmer',
    name: 'The Charmer',
    tagline: 'Every hand is a performance.',
    accent: '#8B6FC9',
    portraitBg: '#14101d',
    portraitFg: '#B39DE0',
    lines: {
      deal: [
        'And the evening begins...',
        'For you — the finest cards in the shoe.',
        'Let us see what fortune has arranged.',
      ],
      playerBlackjack: [
        'Twenty-one, darling. Simply exquisite.',
        'A natural. The table applauds.',
      ],
      dealerBust: [
        'I overreach — how embarrassing for me.',
        'The house falters. Enjoy it.',
      ],
      playerBust: [
        'Ah. A tragedy in one act.',
        'Too bold, too soon. Charming, though.',
      ],
      push: ['A stalemate. How diplomatic.', 'We part as equals — for now.'],
      bigWin: ['Magnificent. The pit boss will hear of this.', 'A performance worth the price of admission.'],
      win: ['The hand is yours. Take a bow.', 'Beautifully done.'],
      lose: ['The house insists. Forgive me.', 'Fortune is a fickle companion.'],
    },
  },
  {
    id: 'archivist',
    name: 'The Archivist',
    tagline: 'Counts every card. Remembers every hand.',
    accent: '#5FA37A',
    portraitBg: '#0e1712',
    portraitFg: '#8FCBA8',
    lines: {
      deal: [
        'Hand number recorded. Proceed.',
        'The odds are catalogued. Play begins.',
        'Every shoe tells a story.',
      ],
      playerBlackjack: [
        'A 4.8 percent event. Duly noted.',
        'Natural twenty-one. Statistically delightful.',
      ],
      dealerBust: [
        'The house busts. As probability allows.',
        'An expected deviation. You are paid.',
      ],
      playerBust: [
        'Over twenty-one. Filed under hubris.',
        'The variance was not in your favor.',
      ],
      push: ['Equilibrium. The rarest outcome.', 'A push. The ledger stays balanced.'],
      bigWin: ['An outlier evening. Enjoy the tail end of the curve.', 'Remarkable. I will remember this one.'],
      win: ['Your hand prevails. Recorded.', 'The odds favored you tonight.'],
      lose: ['The house edge asserts itself.', 'Regression to the mean. Nothing personal.'],
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
