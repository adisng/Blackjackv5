'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { LoadingScreen } from '@/components/loading-screen'
import { DealerPortrait, DealerSelect } from '@/components/menu/dealer-select'
import { SettingsDrawer } from '@/components/menu/settings-drawer'
import { getDealer } from '@/lib/game/dealers'
import { useSettings } from '@/lib/game/settings-store'
import { useGame } from '@/lib/game/store'

export default function MainMenu() {
  const [loaded, setLoaded] = useState(false)
  const [dealerOpen, setDealerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const balance = useGame((s) => s.balance)
  const dealerId = useSettings((s) => s.dealerId)
  const dealer = getDealer(dealerId)

  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <main className="relative min-h-screen bg-background flex flex-col">
      {!loaded && <LoadingScreen onDone={handleLoaded} />}

      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Private Table
        </p>
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-2"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-4">Est. Tonight</p>
          <h1 className="font-serif text-5xl md:text-7xl tracking-[0.25em] text-foreground pl-[0.25em] text-balance">
            HOUSE EDGE
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed text-pretty">
            A private blackjack table. Six decks, one seat, and a dealer who never blinks.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/table"
              className="px-10 py-4 border border-gold text-gold text-sm uppercase tracking-[0.25em] rounded-md transition-colors hover:bg-gold hover:text-primary-foreground"
            >
              Enter the Table
            </Link>

            <button
              onClick={() => setDealerOpen(true)}
              className="mt-2 flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 hover:border-muted-foreground transition-colors"
              aria-label={`Choose your dealer. Currently ${dealer.name}`}
            >
              <DealerPortrait dealerId={dealerId} size="sm" />
              <span className="text-left">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Your dealer
                </span>
                <span className="block text-sm text-foreground font-serif">{dealer.name}</span>
              </span>
              <span className="ml-2 text-xs text-muted-foreground">Change</span>
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="flex items-center justify-center pb-8">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5">
          <span
            className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-gold"
            aria-hidden="true"
          />
          <span className="text-sm text-foreground tabular-nums">{balance.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            chips
          </span>
        </div>
      </footer>

      <DealerSelect open={dealerOpen} onClose={() => setDealerOpen(false)} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  )
}
