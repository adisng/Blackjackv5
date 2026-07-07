'use client'

import type { Rank, Suit } from './types'

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

const FONT_URLS = ['/fonts/Geist-Bold.ttf', '/fonts/Geist-Regular.ttf']

let preloadPromise: Promise<void> | null = null

/**
 * Downloads and warms every asset the game needs before first render:
 * 1. The 3D scene JavaScript chunk (three.js, fiber, drei, table components)
 * 2. The font files used by in-scene 3D text
 * 3. All 53 procedural card textures (52 faces + the shared back)
 *
 * Progress is reported as 0-100 based on real completed work.
 * Idempotent — repeat calls reuse the same promise.
 */
export function preloadAssets(onProgress: (pct: number) => void): Promise<void> {
  if (preloadPromise) {
    onProgress(100)
    return preloadPromise
  }

  preloadPromise = (async () => {
    // Weights: scene chunk 45, fonts 15, textures 40
    let sceneDone = 0
    let fontsDone = 0
    let texturesDone = 0
    const report = () => onProgress(Math.round(sceneDone * 45 + fontsDone * 15 + texturesDone * 40))

    report()

    // 1. Warm the heavy 3D chunk (three + fiber + drei + scene components)
    const scenePromise = Promise.all([
      import('@/components/table/table-scene'),
      import('@/components/cards/card-textures'),
    ]).then(([, textures]) => {
      sceneDone = 1
      report()
      return textures
    })

    // 2. Warm the HTTP cache for the 3D text fonts (used by drei <Text>)
    const fontsPromise = Promise.all(
      FONT_URLS.map((url) =>
        fetch(url, { cache: 'force-cache' }).catch(() => null),
      ),
    ).then(() => {
      fontsDone = 1
      report()
    })

    const textures = await scenePromise
    await fontsPromise

    // 3. Pre-generate every card texture in small chunks so the UI stays smooth
    const combos: Array<[Rank, Suit]> = []
    for (const suit of SUITS) for (const rank of RANKS) combos.push([rank, suit])

    textures.getBackTexture()
    const CHUNK = 8
    for (let i = 0; i < combos.length; i += CHUNK) {
      for (const [rank, suit] of combos.slice(i, i + CHUNK)) {
        textures.getFaceTexture(rank, suit)
      }
      texturesDone = Math.min(1, (i + CHUNK) / combos.length)
      report()
      // Yield to the main thread between chunks
      await new Promise((r) => setTimeout(r, 0))
    }

    texturesDone = 1
    report()
  })()

  return preloadPromise
}
