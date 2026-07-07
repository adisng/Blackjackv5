'use client'

import * as THREE from 'three'
import type { Rank, Suit } from '@/lib/game/types'

const IVORY = '#F2EFE6'
const RED = '#B3382C'
const DARK = '#17181B'
const GOLD = '#C9A227'
const CHARCOAL = '#121317'

const SUIT_GLYPHS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
}

const faceCache = new Map<string, THREE.CanvasTexture>()
let backCache: THREE.CanvasTexture | null = null

const W = 256
const H = 358

/** Generate a card face texture (rank + suit) on a canvas. Cached per rank+suit. */
export function getFaceTexture(rank: Rank, suit: Suit): THREE.CanvasTexture {
  const key = `${rank}-${suit}`
  const cached = faceCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Ivory face with rounded corners
  ctx.fillStyle = IVORY
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  // Subtle inner border
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 2
  roundRect(ctx, 6, 6, W - 12, H - 12, 14)
  ctx.stroke()

  const color = suit === 'hearts' || suit === 'diamonds' ? RED : DARK
  const glyph = SUIT_GLYPHS[suit]

  // Corner indices (top-left, and rotated bottom-right)
  ctx.fillStyle = color
  ctx.textAlign = 'center'

  ctx.font = '600 44px Georgia, serif'
  ctx.fillText(rank, 34, 52)
  ctx.font = '36px Georgia, serif'
  ctx.fillText(glyph, 34, 90)

  ctx.save()
  ctx.translate(W - 34, H - 52 + 14)
  ctx.rotate(Math.PI)
  ctx.font = '600 44px Georgia, serif'
  ctx.fillText(rank, 0, 14)
  ctx.font = '36px Georgia, serif'
  ctx.fillText(glyph, 0, 52)
  ctx.restore()

  // Large center suit
  ctx.font = '120px Georgia, serif'
  ctx.fillText(glyph, W / 2, H / 2 + 42)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  faceCache.set(key, texture)
  return texture
}

/** Card back: charcoal with a gold geometric lattice. Single cached texture. */
export function getBackTexture(): THREE.CanvasTexture {
  if (backCache) return backCache

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = CHARCOAL
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  // Gold border frame
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 3
  roundRect(ctx, 12, 12, W - 24, H - 24, 12)
  ctx.stroke()

  // Diamond lattice pattern
  ctx.save()
  roundRect(ctx, 20, 20, W - 40, H - 40, 8)
  ctx.clip()
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.28)'
  ctx.lineWidth = 1.5
  const step = 26
  for (let x = -H; x < W + H; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + H, H)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, H)
    ctx.lineTo(x + H, 0)
    ctx.stroke()
  }
  ctx.restore()

  // Center medallion
  ctx.fillStyle = CHARCOAL
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 42, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 42, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = '28px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('HE', W / 2, H / 2 + 10)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  backCache = texture
  return texture
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
