'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Card } from '@/lib/game/types'
import { getBackTexture, getFaceTexture } from './card-textures'

export const CARD_W = 0.62
export const CARD_H = 0.87
export const CARD_T = 0.008

export const SHOE_POSITION: [number, number, number] = [2.5, 0.35, -2.1]

// Shared geometry across all cards
let sharedGeometry: THREE.BoxGeometry | null = null
function getGeometry() {
  if (!sharedGeometry) {
    sharedGeometry = new THREE.BoxGeometry(CARD_W, CARD_T, CARD_H)
  }
  return sharedGeometry
}

// Shared materials: one edge, one back, one face material per rank+suit.
// Cached at module level so re-dealing the same card never allocates.
let sharedEdge: THREE.MeshStandardMaterial | null = null
let sharedBack: THREE.MeshStandardMaterial | null = null
const materialCache = new Map<string, THREE.Material[]>()

function getMaterials(rank: Card['rank'], suit: Card['suit']): THREE.Material[] {
  const key = `${rank}-${suit}`
  const cached = materialCache.get(key)
  if (cached) return cached

  if (!sharedEdge) {
    sharedEdge = new THREE.MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.8 })
  }
  if (!sharedBack) {
    sharedBack = new THREE.MeshStandardMaterial({
      map: getBackTexture(),
      roughness: 0.55,
      metalness: 0.05,
    })
  }
  const face = new THREE.MeshStandardMaterial({
    map: getFaceTexture(rank, suit),
    roughness: 0.55,
    metalness: 0,
  })
  // BoxGeometry material order: +x, -x, +y, -y, +z, -z
  // Card lies flat: +y is the top face (shows face when face-up rotation applied)
  const materials = [sharedEdge, sharedEdge, face, sharedBack, sharedEdge, sharedEdge]
  materialCache.set(key, materials)
  return materials
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

interface Card3DProps {
  card: Card
  /** Final resting position on the felt */
  position: [number, number, number]
  /** True renders the card face-up (or flips it up when it becomes true) */
  faceUp: boolean
  /** Delay in seconds before the deal animation starts */
  delay?: number
  /** Applied shake offset (bust reaction), driven by parent */
  shakeAmp?: number
  reducedMotion?: boolean
}

export function Card3D({
  card,
  position,
  faceUp,
  delay = 0,
  shakeAmp = 0,
  reducedMotion = false,
}: Card3DProps) {
  const group = useRef<THREE.Group>(null)
  const state = useRef({
    t: 0,
    started: false,
    delayLeft: delay,
    flip: faceUp ? 1 : 0, // 0 = face down, 1 = face up
    landed: reducedMotion,
  })
  const faceUpRef = useRef(faceUp)
  faceUpRef.current = faceUp

  const materials = useMemo(() => getMaterials(card.rank, card.suit), [card.rank, card.suit])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const s = state.current

    if (reducedMotion) {
      // Snap to final state, only animate flip quickly
      const targetFlip = faceUpRef.current ? 1 : 0
      s.flip = THREE.MathUtils.lerp(s.flip, targetFlip, Math.min(1, delta * 14))
      g.position.set(position[0], position[1], position[2])
      g.rotation.z = (1 - s.flip) * Math.PI
      g.visible = true
      return
    }

    // Deal delay
    if (!s.started) {
      g.visible = false
      s.delayLeft -= delta
      if (s.delayLeft <= 0) s.started = true
      return
    }
    g.visible = true

    // Deal path: arc from shoe to landing spot
    if (s.t < 1) {
      s.t = Math.min(1, s.t + delta / 0.42)
      const e = easeOutCubic(s.t)
      const x = THREE.MathUtils.lerp(SHOE_POSITION[0], position[0], e)
      const z = THREE.MathUtils.lerp(SHOE_POSITION[2], position[2], e)
      // Lift arc: parabola peaking mid-flight
      const lift = Math.sin(e * Math.PI) * 0.55
      const y = THREE.MathUtils.lerp(SHOE_POSITION[1], position[1], e) + lift
      g.position.set(x, y, z)
      g.rotation.y = (1 - e) * 0.5
      if (s.t >= 1) s.landed = true
    } else {
      // Settle at final position with shake offset if any
      const shakeX = shakeAmp > 0 ? Math.sin(performance.now() / 28) * shakeAmp : 0
      g.position.set(position[0] + shakeX, position[1], position[2])
      g.rotation.y = 0
    }

    // Flip: rotate around Z axis (card lies flat, so Z-rotation flips it over)
    const targetFlip = faceUpRef.current && s.landed ? 1 : 0
    const flipSpeed = 5.5
    if (Math.abs(s.flip - targetFlip) > 0.001) {
      s.flip = THREE.MathUtils.damp(s.flip, targetFlip, flipSpeed, delta)
      // Lift slightly during flip so it doesn't clip the felt
      const mid = Math.sin(s.flip * Math.PI)
      if (s.t >= 1) g.position.y = position[1] + mid * 0.18
    }
    g.rotation.z = (1 - s.flip) * Math.PI
  })

  return (
    <group ref={group} position={[SHOE_POSITION[0], SHOE_POSITION[1], SHOE_POSITION[2]]}>
      <mesh geometry={getGeometry()} material={materials} castShadow receiveShadow />
    </group>
  )
}
