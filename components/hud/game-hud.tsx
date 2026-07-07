'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { ArrowLeft, Settings } from 'lucide-react'
import {
  CHIP_DENOMS,
  MAX_BET,
  MIN_BET,
  useGame,
} from '@/lib/game/store'
import { handValue, canSplitHand, isBlackjack } from '@/lib/game/hand'
import { getDealer } from '@/lib/game/dealers'
import { useSettings } from '@/lib/game/settings-store'
import { ensureAudioUnlocked, playSound, stopMusic } from '@/lib/game/sounds'
import { SettingsDrawer } from '@/components/menu/settings-drawer'
import { ReviewModal } from '@/components/review-modal'
import { DEFAULT_DECK_COUNT } from '@/lib/game/deck'

const CHIP_STYLES: Record<number, string> = {
  1: 'border-muted-foreground/60 text-foreground',
  5: 'border-[#c8695c] text-[#e0a49b]',
  25: 'border-[#5FA37A] text-[#8FCBA8]',
  100: 'border-foreground/40 text-foreground',
  500: 'border-[#8B6FC9] text-[#B39DE0]',
}

/** How long action buttons stay hidden after a hit while the card flies in. */
const ACTION_HIDE_MS = 700

function HandBadge({
  cards,
  active,
  outcome,
}: {
  cards: { rank: string; suit: string }[]
  active?: boolean
  outcome?: string | null
}) {
  const { total, soft } = handValue(cards as never)
  if (cards.length === 0) return null
  return (
    <motion.span
      key={total}
      initial={{ scale: 1.25 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 text-sm tabular-nums bg-card/70 backdrop-blur ${
        outcome === 'bust'
          ? 'border-destructive/60 text-destructive'
          : active
            ? 'border-gold text-gold'
            : 'border-border text-foreground'
      }`}
    >
      {soft && total <= 21 && (
        <span className="text-[10px] uppercase tracking-wider opacity-70">soft</span>
      )}
      {total}
    </motion.span>
  )
}

/** Balance readout that counts up/down like a slot machine tally. */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)

  useEffect(() => {
    const node = ref.current
    if (!node || prev.current === value) return
    const controls = animate(prev.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString()
      },
    })
    prev.current = value
    return () => controls.stop()
  }, [value])

  return (
    <span ref={ref} className="text-sm text-foreground tabular-nums">
      {value.toLocaleString()}
    </span>
  )
}

/** Slide-up/slide-down wrapper so control clusters appear and vanish smoothly. */
function ControlCluster({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="pointer-events-auto flex flex-col items-center gap-4"
    >
      {children}
    </motion.div>
  )
}

export function GameHud() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionsBusy, setActionsBusy] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const completedRounds = useRef(0)
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const phase = useGame((s) => s.phase)
  const balance = useGame((s) => s.balance)
  const bet = useGame((s) => s.bet)
  const shoe = useGame((s) => s.shoe)
  const playerHands = useGame((s) => s.playerHands)
  const activeHandIndex = useGame((s) => s.activeHandIndex)
  const dealerCards = useGame((s) => s.dealerCards)
  const holeRevealed = useGame((s) => s.holeRevealed)
  const insuranceOffered = useGame((s) => s.insuranceOffered)
  const banner = useGame((s) => s.banner)
  const dealerLine = useGame((s) => s.dealerLine)
  const lastNet = useGame((s) => s.lastNet)
  const roundId = useGame((s) => s.roundId)

  const addChip = useGame((s) => s.addChip)
  const clearBet = useGame((s) => s.clearBet)
  const deal = useGame((s) => s.deal)
  const hit = useGame((s) => s.hit)
  const stand = useGame((s) => s.stand)
  const doubleDown = useGame((s) => s.doubleDown)
  const split = useGame((s) => s.split)
  const takeInsurance = useGame((s) => s.takeInsurance)
  const declineInsurance = useGame((s) => s.declineInsurance)
  const nextRound = useGame((s) => s.nextRound)
  const rebetAndDeal = useGame((s) => s.rebetAndDeal)
  const lastBet = useGame((s) => s.lastBet)
  const resetBankroll = useGame((s) => s.resetBankroll)
  const leaveTable = useGame((s) => s.leaveTable)

  const dealerId = useSettings((s) => s.dealerId)
  const dealer = getDealer(dealerId)

  const activeHand = playerHands[activeHandIndex]
  const canAct = phase === 'PLAYER_TURN' && !insuranceOffered && !!activeHand
  const canDouble =
    canAct && activeHand.cards.length === 2 && balance >= activeHand.bet && !activeHand.fromSplit
  const canSplit =
    canAct &&
    canSplitHand(activeHand.cards) &&
    balance >= activeHand.bet &&
    playerHands.length < 4
  const shoePercent = Math.round((shoe.length / (DEFAULT_DECK_COUNT * 52)) * 100)
  const isBankrupt = balance === 0 && bet === 0 && (phase === 'BETTING' || phase === 'RESULT')

  const dealerVisibleValue = holeRevealed ? dealerCards : dealerCards.slice(1)

  /** Hide the action row while the drawn card flies in, then bring it back. */
  const hideActionsBriefly = (ms = ACTION_HIDE_MS) => {
    setActionsBusy(true)
    if (busyTimer.current) clearTimeout(busyTimer.current)
    busyTimer.current = setTimeout(() => setActionsBusy(false), ms)
  }

  const onHit = () => {
    playSound('click')
    hideActionsBriefly()
    hit()
  }
  const onStand = () => {
    playSound('click')
    stand()
  }
  const onDouble = () => {
    playSound('click')
    hideActionsBriefly(900)
    doubleDown()
  }
  const onSplit = () => {
    playSound('click')
    hideActionsBriefly(900)
    split()
  }

  // Show review modal after every 3 bets placed (deals)
  useEffect(() => {
    if (phase !== 'DEALING') return
    completedRounds.current += 1
    if (completedRounds.current % 3 === 0) {
      setTimeout(() => setReviewOpen(true), 1200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])

  // Unlock audio + start the ambient tune on the first interaction
  useEffect(() => {
    const unlock = () => ensureAudioUnlocked()
    unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopMusic()
      if (busyTimer.current) clearTimeout(busyTimer.current)
    }
  }, [])

  // Desktop keyboard shortcuts: H hit, S stand, D double, P split, Enter deal/next, R rebet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || settingsOpen) return
      const state = useGame.getState()
      const key = e.key.toLowerCase()
      if (state.phase === 'PLAYER_TURN' && !state.insuranceOffered) {
        if (key === 'h') {
          playSound('click')
          hideActionsBriefly()
          state.hit()
        } else if (key === 's') {
          playSound('click')
          state.stand()
        } else if (key === 'd') {
          playSound('click')
          hideActionsBriefly(900)
          state.doubleDown()
        } else if (key === 'p') {
          playSound('click')
          hideActionsBriefly(900)
          state.split()
        }
      } else if (state.phase === 'BETTING' && key === 'enter') {
        playSound('click')
        state.deal()
      } else if (state.phase === 'RESULT') {
        if (key === 'enter') {
          playSound('click')
          state.nextRound()
        } else if (key === 'r') {
          playSound('click')
          state.rebetAndDeal()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen])

  const actionButton =
    'min-w-20 min-h-11 px-4 py-3 sm:px-5 rounded-md border text-xs uppercase tracking-[0.18em] transition-colors disabled:opacity-30 disabled:pointer-events-none touch-manipulation select-none'
  const neutralAction = `${actionButton} border-border text-foreground hover:border-muted-foreground bg-card/80`
  const goldAction = `${actionButton} border-gold text-gold hover:bg-gold hover:text-primary-foreground bg-card/80`

  const showActions = phase === 'PLAYER_TURN' && !insuranceOffered && !actionsBusy

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* ── Result screen flash (gold win / red loss pulse) ── */}
      <AnimatePresence>
        {banner && banner.tone !== 'neutral' && (
          <motion.div
            key={`flash-${roundId}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3, times: [0, 0.12, 1], ease: 'easeOut' }}
            style={{
              background:
                banner.tone === 'gold'
                  ? 'radial-gradient(ellipse at center 60%, rgba(201,162,39,0.28), transparent 65%)'
                  : 'radial-gradient(ellipse at center 60%, rgba(180,50,50,0.18), transparent 65%)',
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <header className="flex items-start justify-between p-3 md:p-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            onClick={leaveTable}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-[0.2em] py-2"
            aria-label="Back to main menu"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Leave</span>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-muted-foreground tabular-nums">
            Shoe {shoePercent}% · {DEFAULT_DECK_COUNT} decks
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 pointer-events-none mr-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Dealer</p>
          <p className="font-serif text-sm" style={{ color: dealer.accent }}>
            {dealer.name}
          </p>
        </div>

        <button
          onClick={() => {
            playSound('click')
            setSettingsOpen(true)
          }}
          className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors p-2"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* ── Dealer hand total ── */}
      <div className="flex justify-center">
        {dealerCards.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Dealer
            </span>
            <HandBadge cards={dealerVisibleValue as never} />
            {!holeRevealed && dealerCards.length > 1 && (
              <span className="text-[10px] text-muted-foreground">+ hole card</span>
            )}
          </div>
        )}
      </div>

      {/* ── Result banner + dealer line ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ opacity: 0, scale: 1.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <h2
                className={`font-serif text-4xl md:text-5xl tracking-wide text-balance ${
                  banner.tone === 'gold'
                    ? 'text-gold'
                    : banner.tone === 'red'
                      ? 'text-destructive'
                      : 'text-foreground'
                }`}
                style={
                  banner.tone === 'gold'
                    ? { textShadow: '0 0 28px rgba(201,162,39,0.55), 0 0 60px rgba(201,162,39,0.25)' }
                    : undefined
                }
              >
                {banner.text}
              </h2>
              {lastNet !== 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 6, scale: 1.3 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.18, type: 'spring', stiffness: 400, damping: 22 }}
                  className={`text-sm tabular-nums ${lastNet > 0 ? 'text-gold' : 'text-muted-foreground'}`}
                >
                  {lastNet > 0 ? '+' : ''}
                  {lastNet.toLocaleString()} chips
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {dealerLine && (
            <motion.p
              key={dealerLine}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-sm italic text-muted-foreground text-center max-w-md text-pretty"
            >
              {dealerLine}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Insurance prompt */}
        <AnimatePresence>
          {insuranceOffered && activeHand && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-auto mt-2 flex flex-col items-center gap-3 rounded-lg border border-border bg-card/95 backdrop-blur px-6 py-5"
              role="alertdialog"
              aria-label="Insurance offer"
            >
              <p className="font-serif text-lg text-foreground">Dealer shows an Ace</p>
              <p className="text-xs text-muted-foreground">
                Insurance costs {(activeHand.bet / 2).toLocaleString()} — pays 2:1 if the dealer
                has blackjack.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    playSound('click')
                    takeInsurance()
                  }}
                  className={goldAction}
                >
                  Take insurance
                </button>
                <button
                  onClick={() => {
                    playSound('click')
                    declineInsurance()
                  }}
                  className={neutralAction}
                >
                  No thanks
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Player hand totals — floated above the cards so they never cover them ── */}
      <div className="flex justify-center gap-4 pb-2 mb-24 md:mb-28">
        {playerHands.map((hand, i) => (
          <div key={i} className="flex items-center gap-2">
            {playerHands.length > 1 && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Hand {i + 1}
              </span>
            )}
            <HandBadge
              cards={hand.cards as never}
              active={i === activeHandIndex && phase === 'PLAYER_TURN'}
              outcome={hand.outcome ?? (hand.busted ? 'bust' : null)}
            />
            {isBlackjack(hand.cards) && !hand.fromSplit && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold">Blackjack</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Bottom control bar ── */}
      <footer className="p-3 md:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-6 flex flex-col items-center gap-3 md:gap-4">
        <AnimatePresence mode="wait" initial={false}>
          {/* Betting phase */}
          {phase === 'BETTING' && !isBankrupt && (
            <ControlCluster id="betting">
              <div className="flex items-center gap-2 md:gap-3" role="group" aria-label="Chip selector">
                {CHIP_DENOMS.map((denom) => (
                  <motion.button
                    key={denom}
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.08, y: -3 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    onClick={() => addChip(denom)}
                    disabled={bet + denom > balance || bet + denom > MAX_BET}
                    className={`h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full border-2 border-dashed bg-card/90 backdrop-blur flex items-center justify-center text-xs sm:text-sm tabular-nums disabled:opacity-25 disabled:pointer-events-none touch-manipulation select-none ${CHIP_STYLES[denom]}`}
                    aria-label={`Add ${denom} chip to bet`}
                  >
                    {denom}
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Current bet
                  </p>
                  <motion.p
                    key={bet}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="text-lg tabular-nums text-foreground"
                  >
                    {bet.toLocaleString()}
                  </motion.p>
                </div>
                <button
                  onClick={() => {
                    playSound('click')
                    clearBet()
                  }}
                  disabled={bet === 0}
                  className={neutralAction}
                >
                  Clear
                </button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    playSound('click')
                    deal()
                  }}
                  disabled={bet < MIN_BET}
                  className={goldAction}
                >
                  Deal
                </motion.button>
              </div>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                Table limits {MIN_BET} – {MAX_BET}
              </p>
            </ControlCluster>
          )}

          {/* Bankrupt recovery */}
          {isBankrupt && (
            <ControlCluster id="bankrupt">
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/95 backdrop-blur px-8 py-6">
                <p className="font-serif text-xl text-foreground">The house cleaned you out.</p>
                <p className="text-xs text-muted-foreground">
                  Management extends a courtesy line of credit.
                </p>
                <button
                  onClick={() => {
                    playSound('click')
                    resetBankroll()
                  }}
                  className={goldAction}
                >
                  Accept 1,000 chips
                </button>
              </div>
            </ControlCluster>
          )}

          {/* Player turn actions — hidden while a hit card flies in */}
          {showActions && (
            <ControlCluster id="actions">
              <div className="grid w-full max-w-xs grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                <motion.button whileTap={{ scale: 0.9 }} onClick={onHit} disabled={!canAct} className={goldAction}>
                  Hit
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onStand} disabled={!canAct} className={neutralAction}>
                  Stand
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onDouble} disabled={!canDouble} className={neutralAction}>
                  Double
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onSplit} disabled={!canSplit} className={neutralAction}>
                  Split
                </motion.button>
              </div>
            </ControlCluster>
          )}

          {/* Dealing / dealer turn / card-in-flight indicator */}
          {(phase === 'DEALING' ||
            phase === 'DEALER_TURN' ||
            (phase === 'PLAYER_TURN' && !insuranceOffered && actionsBusy)) && (
            <motion.p
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs uppercase tracking-[0.3em] text-muted-foreground animate-pulse py-4"
            >
              {phase === 'DEALING' ? 'Dealing' : phase === 'DEALER_TURN' ? 'Dealer plays' : 'Card coming'}
            </motion.p>
          )}

          {/* Result phase */}
          {phase === 'RESULT' && !isBankrupt && (
            <ControlCluster id="result">
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                {lastBet >= MIN_BET && lastBet <= balance && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      playSound('click')
                      rebetAndDeal()
                    }}
                    className={goldAction}
                  >
                    Rebet {Math.min(lastBet, balance).toLocaleString()} & deal
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    playSound('click')
                    nextRound()
                  }}
                  className={lastBet >= MIN_BET && lastBet <= balance ? neutralAction : goldAction}
                >
                  Change bet
                </motion.button>
              </div>
            </ControlCluster>
          )}
        </AnimatePresence>

        {/* Balance scoreboard */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur px-5 py-2">
          <span
            className="h-3 w-3 rounded-full border-2 border-dashed border-gold"
            aria-hidden="true"
          />
          <AnimatedNumber value={balance} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            chips
          </span>
        </div>
      </footer>

      <div className="pointer-events-auto">
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>

      <ReviewModal
        open={reviewOpen}
        dealerName={dealer.name}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  )
}
