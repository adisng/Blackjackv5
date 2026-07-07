'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Card, GamePhase, HandOutcome, PlayerHand } from './types'
import { DEFAULT_DECK_COUNT, needsReshuffle, newShuffledShoe } from './deck'
import { canSplitHand, dealerShouldHit, handValue, isBlackjack, isBust } from './hand'
import { getDealer, pickLine } from './dealers'
import { playSound } from './sounds'

export const STARTING_BALANCE = 1000
export const MIN_BET = 5
export const MAX_BET = 500
export const CHIP_DENOMS = [1, 5, 25, 100, 500] as const

export interface Banner {
  tone: 'gold' | 'red' | 'neutral'
  text: string
}

interface GameState {
  phase: GamePhase
  shoe: Card[]
  balance: number
  bet: number
  playerHands: PlayerHand[]
  activeHandIndex: number
  dealerCards: Card[]
  holeRevealed: boolean
  insuranceOffered: boolean
  insuranceBet: number
  banner: Banner | null
  dealerLine: string | null
  roundId: number
  lastNet: number
  lastBet: number
  dealerId: string

  leaveTable: () => void
  setDealerId: (id: string) => void
  enterTable: () => void
  addChip: (value: number) => void
  clearBet: () => void
  deal: () => void
  hit: () => void
  stand: () => void
  doubleDown: () => void
  split: () => void
  takeInsurance: () => void
  declineInsurance: () => void
  nextRound: () => void
  rebetAndDeal: () => void
  resetBankroll: () => void
}

function emptyHand(bet: number, fromSplit = false): PlayerHand {
  return { cards: [], bet, doubled: false, stood: false, busted: false, fromSplit, outcome: null }
}

let timers: ReturnType<typeof setTimeout>[] = []
function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}
function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** Draw one card from the shoe (mutates a copied shoe in state). */
      function draw(): Card {
        const shoe = [...get().shoe]
        const card = shoe.pop()!
        set({ shoe })
        return card
      }

      function say(moment: Parameters<typeof pickLine>[1]) {
        const dealer = getDealer(get().dealerId)
        set({ dealerLine: pickLine(dealer, moment) })
      }

      /** Move to next unfinished split hand, or hand control to the dealer. */
      function advance() {
        const { playerHands, activeHandIndex } = get()
        if (activeHandIndex < playerHands.length - 1) {
          set({ activeHandIndex: activeHandIndex + 1 })
          return
        }
        // All hands complete — if every hand busted, skip dealer play
        const allBusted = playerHands.every((h) => h.busted)
        if (allBusted) {
          set({ phase: 'DEALER_TURN', holeRevealed: true })
          playSound('flip')
          later(() => resolveRound(), 900)
        } else {
          runDealerTurn()
        }
      }

      function runDealerTurn() {
        set({ phase: 'DEALER_TURN', holeRevealed: true })
        playSound('flip')

        const step = () => {
          const { dealerCards } = get()
          if (dealerShouldHit(dealerCards)) {
            later(() => {
              const card = draw()
              playSound('deal')
              set({ dealerCards: [...get().dealerCards, card] })
              step()
            }, 750)
          } else {
            later(() => resolveRound(), 900)
          }
        }
        later(step, 700)
      }

      function resolveRound() {
        const { playerHands, dealerCards, balance } = get()
        const dealerVal = handValue(dealerCards).total
        const dealerBusted = dealerVal > 21
        const dealerBJ = isBlackjack(dealerCards)

        let payout = 0
        let wagered = 0
        const resolved: PlayerHand[] = playerHands.map((hand) => {
          wagered += hand.bet
          let outcome: HandOutcome
          const val = handValue(hand.cards).total
          const playerBJ = isBlackjack(hand.cards) && !hand.fromSplit

          if (hand.busted) {
            outcome = 'bust'
          } else if (playerBJ && !dealerBJ) {
            outcome = 'blackjack'
            payout += hand.bet + hand.bet * 1.5
          } else if (dealerBJ && !playerBJ) {
            outcome = 'lose'
          } else if (dealerBusted) {
            outcome = 'win'
            payout += hand.bet * 2
          } else if (val > dealerVal) {
            outcome = 'win'
            payout += hand.bet * 2
          } else if (val < dealerVal) {
            outcome = 'lose'
          } else {
            outcome = 'push'
            payout += hand.bet
          }
          return { ...hand, outcome }
        })

        const net = payout - wagered
        const primary = resolved[0].outcome

        let banner: Banner
        if (resolved.every((h) => h.outcome === 'bust')) {
          banner = { tone: 'red', text: 'Bust' }
        } else if (primary === 'blackjack') {
          banner = { tone: 'gold', text: 'Blackjack!' }
        } else if (net > 0) {
          banner = { tone: 'gold', text: 'You Win' }
        } else if (net === 0) {
          banner = { tone: 'neutral', text: 'Push' }
        } else {
          banner = { tone: 'red', text: 'Dealer Wins' }
        }

        // Dealer flavor line
        if (resolved.every((h) => h.outcome === 'bust')) say('playerBust')
        else if (primary === 'blackjack') say('playerBlackjack')
        else if (dealerBusted) say('dealerBust')
        else if (net >= 250) say('bigWin')
        else if (net > 0) say('win')
        else if (net === 0) say('push')
        else say('lose')

        if (primary === 'blackjack') playSound('blackjack')
        else if (net > 0) playSound('win')
        else if (net < 0) playSound('lose')
        else playSound('push')

        set({
          phase: 'RESULT',
          playerHands: resolved,
          balance: balance + payout,
          banner,
          lastNet: net,
        })
      }

      return {
        phase: 'IDLE' as GamePhase,
        shoe: [],
        balance: STARTING_BALANCE,
        bet: 0,
        playerHands: [],
        activeHandIndex: 0,
        dealerCards: [],
        holeRevealed: false,
        insuranceOffered: false,
        insuranceBet: 0,
        banner: null,
        dealerLine: null,
        roundId: 0,
        lastNet: 0,
        lastBet: 0,
        dealerId: 'veteran',

        setDealerId: (dealerId) => set({ dealerId }),

        leaveTable: () => {
          clearTimers()
          set({
            phase: 'IDLE',
            bet: 0,
            playerHands: [],
            activeHandIndex: 0,
            dealerCards: [],
            holeRevealed: false,
            insuranceOffered: false,
            insuranceBet: 0,
            banner: null,
            dealerLine: null,
          })
        },

        enterTable: () => {
          clearTimers()
          let shoe = get().shoe
          if (shoe.length === 0 || needsReshuffle(shoe, DEFAULT_DECK_COUNT)) {
            shoe = newShuffledShoe(DEFAULT_DECK_COUNT)
          }
          set({
            phase: 'BETTING',
            shoe,
            bet: 0,
            playerHands: [],
            activeHandIndex: 0,
            dealerCards: [],
            holeRevealed: false,
            insuranceOffered: false,
            insuranceBet: 0,
            banner: null,
            dealerLine: null,
          })
        },

        addChip: (value) => {
          const { phase, bet, balance } = get()
          if (phase !== 'BETTING') return
          const next = bet + value
          if (next > balance || next > MAX_BET) return
          playSound('chip')
          set({ bet: next })
        },

        clearBet: () => {
          if (get().phase !== 'BETTING') return
          set({ bet: 0 })
        },

        deal: () => {
          const { phase, bet, balance } = get()
          if (phase !== 'BETTING' || bet < MIN_BET || bet > balance) return

          // Reshuffle if the shoe is running low
          let shoe = get().shoe
          if (needsReshuffle(shoe, DEFAULT_DECK_COUNT)) {
            shoe = newShuffledShoe(DEFAULT_DECK_COUNT)
            set({ shoe })
          }

          clearTimers()
          set({
            phase: 'DEALING',
            balance: balance - bet,
            lastBet: bet,
            playerHands: [emptyHand(bet)],
            activeHandIndex: 0,
            dealerCards: [],
            holeRevealed: false,
            insuranceOffered: false,
            insuranceBet: 0,
            banner: null,
            roundId: get().roundId + 1,
          })
          say('deal')

          // Deal order: player, dealer (hole, face-down), player, dealer (up)
          const stagger = 260
          later(() => {
            playSound('deal')
            const c = draw()
            set({ playerHands: [{ ...get().playerHands[0], cards: [c] }] })
          }, stagger)
          later(() => {
            playSound('deal')
            set({ dealerCards: [draw()] })
          }, stagger * 2)
          later(() => {
            playSound('deal')
            const h = get().playerHands[0]
            set({ playerHands: [{ ...h, cards: [...h.cards, draw()] }] })
          }, stagger * 3)
          later(() => {
            playSound('deal')
            set({ dealerCards: [...get().dealerCards, draw()] })
          }, stagger * 4)

          // After the deal settles, check insurance / blackjacks
          later(() => {
            const { dealerCards, playerHands: hands, balance: bal } = get()
            const upCard = dealerCards[1]
            const playerBJ = isBlackjack(hands[0].cards)

            if (upCard.rank === 'A' && bal >= hands[0].bet / 2) {
              // Offer insurance before anything else
              set({ phase: 'PLAYER_TURN', insuranceOffered: true })
              return
            }

            const dealerBJ = isBlackjack(dealerCards)
            if (dealerBJ || playerBJ) {
              set({ holeRevealed: dealerBJ })
              later(() => resolveRound(), dealerBJ ? 700 : 300)
              return
            }
            set({ phase: 'PLAYER_TURN' })
          }, stagger * 4 + 600)
        },

        takeInsurance: () => {
          const { insuranceOffered, playerHands, balance, dealerCards } = get()
          if (!insuranceOffered) return
          const cost = playerHands[0].bet / 2
          playSound('chip')
          set({ insuranceOffered: false, insuranceBet: cost, balance: balance - cost })

          const dealerBJ = isBlackjack(dealerCards)
          if (dealerBJ) {
            // Insurance pays 2:1 (return stake + 2x)
            later(() => {
              set({ holeRevealed: true, balance: get().balance + cost * 3 })
              playSound('flip')
              later(() => resolveRound(), 800)
            }, 500)
          } else if (isBlackjack(playerHands[0].cards)) {
            later(() => resolveRound(), 400)
          }
        },

        declineInsurance: () => {
          const { insuranceOffered, dealerCards, playerHands } = get()
          if (!insuranceOffered) return
          set({ insuranceOffered: false })

          const dealerBJ = isBlackjack(dealerCards)
          if (dealerBJ) {
            later(() => {
              set({ holeRevealed: true })
              playSound('flip')
              later(() => resolveRound(), 800)
            }, 400)
          } else if (isBlackjack(playerHands[0].cards)) {
            later(() => resolveRound(), 400)
          }
        },

        hit: () => {
          const { phase, playerHands, activeHandIndex, insuranceOffered } = get()
          if (phase !== 'PLAYER_TURN' || insuranceOffered) return
          const card = draw()
          playSound('deal')
          const hands = playerHands.map((h, i) =>
            i === activeHandIndex ? { ...h, cards: [...h.cards, card] } : h,
          )
          const hand = hands[activeHandIndex]
          if (isBust(hand.cards)) {
            hands[activeHandIndex] = { ...hand, busted: true }
            set({ playerHands: hands })
            later(() => advance(), 600)
          } else if (handValue(hand.cards).total === 21) {
            hands[activeHandIndex] = { ...hand, stood: true }
            set({ playerHands: hands })
            later(() => advance(), 500)
          } else {
            set({ playerHands: hands })
          }
        },

        stand: () => {
          const { phase, playerHands, activeHandIndex, insuranceOffered } = get()
          if (phase !== 'PLAYER_TURN' || insuranceOffered) return
          playSound('stand')
          const hands = playerHands.map((h, i) =>
            i === activeHandIndex ? { ...h, stood: true } : h,
          )
          set({ playerHands: hands })
          advance()
        },

        doubleDown: () => {
          const { phase, playerHands, activeHandIndex, balance, insuranceOffered } = get()
          if (phase !== 'PLAYER_TURN' || insuranceOffered) return
          const hand = playerHands[activeHandIndex]
          if (hand.cards.length !== 2 || balance < hand.bet) return

          playSound('chip')
          const card = draw()
          later(() => playSound('deal'), 150)
          const hands = playerHands.map((h, i) =>
            i === activeHandIndex
              ? {
                  ...h,
                  bet: h.bet * 2,
                  doubled: true,
                  cards: [...h.cards, card],
                  busted: isBust([...h.cards, card]),
                  stood: !isBust([...h.cards, card]),
                }
              : h,
          )
          set({ playerHands: hands, balance: balance - hand.bet })
          later(() => advance(), 800)
        },

        split: () => {
          const { phase, playerHands, activeHandIndex, balance, insuranceOffered } = get()
          if (phase !== 'PLAYER_TURN' || insuranceOffered) return
          const hand = playerHands[activeHandIndex]
          if (!canSplitHand(hand.cards) || balance < hand.bet || playerHands.length >= 4) return

          playSound('chip')
          const first: PlayerHand = { ...emptyHand(hand.bet, true), cards: [hand.cards[0]] }
          const second: PlayerHand = { ...emptyHand(hand.bet, true), cards: [hand.cards[1]] }
          const hands = [...playerHands]
          hands.splice(activeHandIndex, 1, first, second)
          set({ playerHands: hands, balance: balance - hand.bet })

          // Deal one card to each new hand, staggered
          later(() => {
            playSound('deal')
            const hs = [...get().playerHands]
            hs[activeHandIndex] = {
              ...hs[activeHandIndex],
              cards: [...hs[activeHandIndex].cards, draw()],
            }
            set({ playerHands: hs })
          }, 300)
          later(() => {
            playSound('deal')
            const hs = [...get().playerHands]
            hs[activeHandIndex + 1] = {
              ...hs[activeHandIndex + 1],
              cards: [...hs[activeHandIndex + 1].cards, draw()],
            }
            set({ playerHands: hs })
          }, 600)
        },

        nextRound: () => {
          if (get().phase !== 'RESULT') return
          clearTimers()
          let shoe = get().shoe
          if (needsReshuffle(shoe, DEFAULT_DECK_COUNT)) {
            shoe = newShuffledShoe(DEFAULT_DECK_COUNT)
          }
          set({
            phase: 'BETTING',
            shoe,
            bet: 0,
            playerHands: [],
            activeHandIndex: 0,
            dealerCards: [],
            holeRevealed: false,
            insuranceOffered: false,
            insuranceBet: 0,
            banner: null,
            dealerLine: null,
          })
        },

        rebetAndDeal: () => {
          const { phase, lastBet, balance } = get()
          if (phase !== 'RESULT') return
          const bet = Math.min(lastBet, balance, MAX_BET)
          if (bet < MIN_BET) {
            get().nextRound()
            return
          }
          get().nextRound()
          set({ bet })
          get().deal()
        },

        resetBankroll: () => {
          set({ balance: STARTING_BALANCE, bet: 0 })
        },
      }
    },
    {
      name: 'house-edge-game',
      partialize: (state) => ({
        balance: state.balance,
        dealerId: state.dealerId,
        lastBet: state.lastBet,
      }),
    },
  ),
)
