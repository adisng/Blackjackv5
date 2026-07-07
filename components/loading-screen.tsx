'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { preloadAssets } from '@/lib/game/preload'

const MICRO_COPY = [
  'Shuffling the deck…',
  'Dusting off the felt…',
  'Setting the table…',
  'Counting the shoe…',
  'Polishing the chips…',
  'Dimming the lights…',
]

const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663']

const SESSION_KEY = 'house-edge-loaded'
const MIN_DISPLAY_MS = 1600

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [copyIndex, setCopyIndex] = useState(0)
  const [suitIndex, setSuitIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [skip, setSkip] = useState<boolean | null>(null)
  const startedAt = useRef(0)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setSkip(true)
      // Still warm assets in the background for instant table entry
      preloadAssets(() => {})
      onDone()
    } else {
      startedAt.current = performance.now()
      setSkip(false)
    }
  }, [onDone])

  // Real asset preload: 3D chunk, fonts, and all 53 card textures
  useEffect(() => {
    if (skip !== false) return
    let cancelled = false

    preloadAssets((pct) => {
      if (!cancelled) setProgress(pct)
    }).then(() => {
      if (cancelled) return
      setProgress(100)
      // Respect a minimum display time so the intro never flashes
      const elapsed = performance.now() - startedAt.current
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed)
      setTimeout(() => {
        if (cancelled) return
        setLeaving(true)
        setTimeout(() => {
          sessionStorage.setItem(SESSION_KEY, '1')
          onDone()
        }, 750)
      }, wait + 300)
    })

    return () => {
      cancelled = true
    }
  }, [skip, onDone])

  useEffect(() => {
    if (skip !== false) return
    const copyTimer = setInterval(() => setCopyIndex((i) => (i + 1) % MICRO_COPY.length), 1100)
    const suitTimer = setInterval(() => setSuitIndex((i) => (i + 1) % SUITS.length), 900)
    return () => {
      clearInterval(copyTimer)
      clearInterval(suitTimer)
    }
  }, [skip])

  if (skip !== false) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-4xl md:text-5xl tracking-[0.35em] text-foreground text-center pl-[0.35em]"
      >
        HOUSE EDGE
      </motion.h1>

      <div className="mt-10 h-12 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={suitIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`text-3xl ${suitIndex === 1 || suitIndex === 2 ? 'text-destructive' : 'text-muted-foreground'}`}
            aria-hidden="true"
          >
            {SUITS[suitIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-8 w-56 md:w-72">
        <div className="h-px w-full bg-border overflow-hidden">
          <motion.div
            className="h-full bg-gold origin-left"
            style={{ width: '100%' }}
            animate={{ scaleX: progress / 100 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="mt-6 h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={copyIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            {MICRO_COPY[copyIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <span className="sr-only" role="status">
        Loading, {Math.round(progress)} percent
      </span>
    </motion.div>
  )
}
