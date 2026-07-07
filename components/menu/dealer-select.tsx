'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { DEALERS } from '@/lib/game/dealers'
import { useSettings } from '@/lib/game/settings-store'
import { useGame } from '@/lib/game/store'

export function DealerPortrait({
  dealerId,
  size = 'md',
}: {
  dealerId: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dealer = DEALERS.find((d) => d.id === dealerId) ?? DEALERS[0]
  const dims = size === 'lg' ? 'h-40 w-32' : size === 'md' ? 'h-28 w-22' : 'h-14 w-11'
  const textSize = size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : 'text-lg'
  const initial = dealer.name.replace('The ', '').charAt(0)
  return (
    <div
      className={`${dims} rounded-md flex items-center justify-center border`}
      style={{
        backgroundColor: dealer.portraitBg,
        borderColor: `${dealer.accent}55`,
      }}
      aria-hidden="true"
    >
      <span
        className={`font-serif ${textSize}`}
        style={{ color: dealer.portraitFg }}
      >
        {initial}
      </span>
    </div>
  )
}

export function DealerSelect({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dealerId = useSettings((s) => s.dealerId)
  const setDealerId = useSettings((s) => s.setDealerId)
  const setGameDealerId = useGame((s) => s.setDealerId)

  const choose = (id: string) => {
    setDealerId(id)
    setGameDealerId(id)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose your dealer"
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-4xl bg-card border border-border rounded-t-xl md:rounded-xl p-6 md:p-8"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl text-foreground">Choose Your Dealer</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Each dealer runs the table with their own temperament.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
                aria-label="Close dealer selection"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {DEALERS.map((dealer) => {
                const selected = dealer.id === dealerId
                return (
                  <div
                    key={dealer.id}
                    className={`snap-start shrink-0 w-52 rounded-lg border p-4 flex flex-col items-center gap-3 transition-colors ${
                      selected ? 'bg-secondary' : 'bg-background'
                    }`}
                    style={{
                      borderColor: selected ? dealer.accent : 'var(--border)',
                    }}
                  >
                    <DealerPortrait dealerId={dealer.id} size="md" />
                    <div className="text-center">
                      <h3 className="font-serif text-lg text-foreground">{dealer.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed min-h-8 text-pretty">
                        {dealer.tagline}
                      </p>
                    </div>
                    <button
                      onClick={() => choose(dealer.id)}
                      className={`w-full text-xs uppercase tracking-[0.15em] py-2.5 rounded-md border transition-colors ${
                        selected
                          ? 'border-gold text-gold'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {selected ? 'At the table' : 'Sit at this table'}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
