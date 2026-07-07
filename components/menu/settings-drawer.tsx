'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { FELT_COLORS, useSettings, type FeltColor } from '@/lib/game/settings-store'

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string
  description: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
          value ? 'bg-gold' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
            value ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    soundOn,
    musicOn,
    feltColor,
    reducedMotion,
    toggleSound,
    toggleMusic,
    setFeltColor,
    toggleReducedMotion,
  } = useSettings()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border p-6 flex flex-col"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">Settings</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ToggleRow
              label="Sound"
              description="Card, chip, and result audio"
              value={soundOn}
              onToggle={toggleSound}
            />
            <ToggleRow
              label="Music"
              description="Low-volume ambient lounge tune"
              value={musicOn}
              onToggle={toggleMusic}
            />
            <ToggleRow
              label="Reduced motion"
              description="Disables camera drift and particle effects"
              value={reducedMotion}
              onToggle={toggleReducedMotion}
            />

            <div className="py-4">
              <p className="text-sm text-foreground">Felt color</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">The table surface finish</p>
              <div className="flex gap-3">
                {(Object.keys(FELT_COLORS) as FeltColor[]).map((key) => {
                  const felt = FELT_COLORS[key]
                  const selected = feltColor === key
                  return (
                    <button
                      key={key}
                      onClick={() => setFeltColor(key)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                        selected
                          ? 'border-gold text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: felt.felt }}
                        aria-hidden="true"
                      />
                      {felt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="mt-auto text-[11px] text-muted-foreground leading-relaxed">
              Your balance, dealer, and preferences are stored on this device.
            </p>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
