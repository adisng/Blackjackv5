'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setMuted, setMusicMuted, startMusic } from './sounds'
import { DEFAULT_DEALER_ID } from './dealers'

export type FeltColor = 'emerald' | 'oxblood'

interface SettingsState {
  soundOn: boolean
  musicOn: boolean
  feltColor: FeltColor
  reducedMotion: boolean
  dealerId: string
  toggleSound: () => void
  toggleMusic: () => void
  setFeltColor: (c: FeltColor) => void
  toggleReducedMotion: () => void
  setDealerId: (id: string) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundOn: true,
      musicOn: true,
      feltColor: 'emerald',
      reducedMotion: false,
      dealerId: DEFAULT_DEALER_ID,
      toggleSound: () => {
        const next = !get().soundOn
        setMuted(!next)
        set({ soundOn: next })
      },
      toggleMusic: () => {
        const next = !get().musicOn
        setMusicMuted(!next)
        if (next) startMusic()
        set({ musicOn: next })
      },
      setFeltColor: (feltColor) => set({ feltColor }),
      toggleReducedMotion: () => set({ reducedMotion: !get().reducedMotion }),
      setDealerId: (dealerId) => set({ dealerId }),
    }),
    {
      name: 'house-edge-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          setMuted(!state.soundOn)
          setMusicMuted(!state.musicOn)
        }
      },
    },
  ),
)

/** True if either the OS-level or in-app reduced motion preference is on. */
export function usePrefersReducedMotion(): boolean {
  const inApp = useSettings((s) => s.reducedMotion)
  if (typeof window === 'undefined') return inApp
  const os = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return inApp || os
}

export const FELT_COLORS: Record<FeltColor, { felt: string; trim: string; label: string }> = {
  emerald: { felt: '#0f3d2e', trim: '#0a2b20', label: 'Emerald' },
  oxblood: { felt: '#4a1d1a', trim: '#331311', label: 'Oxblood' },
}
