'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useGame } from '@/lib/game/store'

const GOLD = '#C9A227'

/** The felt surface, leather rail, and wood base. */
export function TableSurface({ feltColor, trimColor }: { feltColor: string; trimColor: string }) {
  return (
    <group>
      {/* Wood base */}
      <RoundedBox args={[8.6, 0.5, 6.2]} radius={0.16} position={[0, -0.38, -0.4]} receiveShadow>
        <meshStandardMaterial color="#1a1410" roughness={0.75} metalness={0.05} />
      </RoundedBox>

      {/* Leather rail */}
      <RoundedBox args={[8.2, 0.22, 5.8]} radius={0.11} position={[0, -0.1, -0.4]} receiveShadow castShadow>
        <meshStandardMaterial color="#211a14" roughness={0.6} metalness={0.08} />
      </RoundedBox>

      {/* Felt */}
      <RoundedBox args={[7.6, 0.1, 5.2]} radius={0.05} position={[0, 0, -0.4]} receiveShadow>
        <meshStandardMaterial color={feltColor} roughness={0.95} metalness={0} />
      </RoundedBox>

      {/* Felt trim line (embossed rectangle) */}
      <mesh position={[0, 0.052, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.92, 2.98, 64]} />
        <meshStandardMaterial color={trimColor} roughness={0.9} transparent opacity={0.9} />
      </mesh>

      {/* Betting circle */}
      <mesh position={[0, 0.053, 1.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.54, 48]} />
        <meshStandardMaterial color={GOLD} roughness={0.7} transparent opacity={0.35} />
      </mesh>

      {/* Floor plane to catch light falloff */}
      <mesh position={[0, -0.66, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#08090b" roughness={1} />
      </mesh>
    </group>
  )
}

/** The card shoe near the dealer's right hand. */
export function CardShoe() {
  return (
    <group position={[2.5, 0.18, -2.1]} rotation={[0, -0.25, 0]}>
      <RoundedBox args={[0.85, 0.32, 1.05]} radius={0.04} castShadow receiveShadow>
        <meshStandardMaterial color="#17181B" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* Angled top plate */}
      <mesh position={[0, 0.17, -0.12]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[0.82, 0.02, 0.85]} />
        <meshStandardMaterial color="#0f1012" roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Gold accent stripe */}
      <mesh position={[0, 0.02, 0.53]}>
        <boxGeometry args={[0.86, 0.03, 0.01]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  )
}

const CHIP_COLORS: Record<number, { base: string; accent: string }> = {
  1: { base: '#c8c4b8', accent: '#8d8a80' },
  5: { base: '#8c3a30', accent: '#c8c4b8' },
  25: { base: '#2e5e4a', accent: '#c8c4b8' },
  100: { base: '#26262c', accent: '#C9A227' },
  500: { base: '#4a3a6b', accent: '#C9A227' },
}

/** Break a bet amount into a stack of chip denominations (largest first). */
export function chipBreakdown(amount: number): number[] {
  const denoms = [500, 100, 25, 5, 1]
  const chips: number[] = []
  let remaining = amount
  for (const d of denoms) {
    while (remaining >= d && chips.length < 14) {
      chips.push(d)
      remaining -= d
    }
  }
  return chips.reverse() // smallest at bottom looks natural enough; keep stable order
}

/** A stack of chips at a given position representing an amount. */
export function ChipStack({
  amount,
  position,
}: {
  amount: number
  position: [number, number, number]
}) {
  const chips = useMemo(() => chipBreakdown(amount), [amount])
  if (amount <= 0) return null
  return (
    <group position={position}>
      {chips.map((denom, i) => {
        const colors = CHIP_COLORS[denom] ?? CHIP_COLORS[1]
        return (
          <group key={i} position={[0, 0.03 + i * 0.055, 0]} rotation={[0, (i * 0.7) % Math.PI, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
              <meshStandardMaterial color={colors.base} roughness={0.5} metalness={0.1} />
            </mesh>
            {/* Beveled top ring */}
            <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.13, 0.2, 32]} />
              <meshStandardMaterial color={colors.accent} roughness={0.45} metalness={0.2} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Hanging pendant lamp above the table. */
export function PendantLamp() {
  return (
    <group position={[0, 4.2, -0.6]}>
      {/* Cord */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
      </mesh>
      {/* Shade */}
      <mesh rotation={[0, 0, 0]}>
        <coneGeometry args={[0.75, 0.55, 32, 1, true]} />
        <meshStandardMaterial color="#141210" roughness={0.5} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Warm glow inside the shade */}
      <mesh position={[0, -0.18, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#ffe8b0" emissive="#ffdf9e" emissiveIntensity={2.2} />
      </mesh>
    </group>
  )
}

/** The dealer's stylized presence: portrait card + engraved name plate. */
export function DealerPresence({
  name,
  accent,
  portraitBg,
  portraitFg,
}: {
  name: string
  accent: string
  portraitBg: string
  portraitFg: string
}) {
  const initial = name.replace('The ', '').charAt(0)
  return (
    <group position={[0, 0.9, -3.4]}>
      {/* Portrait panel */}
      <RoundedBox args={[1.5, 2, 0.08]} radius={0.05} castShadow>
        <meshStandardMaterial color={portraitBg} roughness={0.7} />
      </RoundedBox>
      {/* Accent frame */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.36, 1.86]} />
        <meshStandardMaterial color={portraitBg} roughness={0.8} />
      </mesh>
      <Text
        position={[0, 0.25, 0.06]}
        fontSize={0.85}
        color={portraitFg}
        anchorX="center"
        anchorY="middle"
        font="/fonts/Geist-Bold.ttf"
      >
        {initial}
      </Text>
      {/* Name plate on the rail */}
      <group position={[0, -1.45, 1.15]} rotation={[-0.5, 0, 0]}>
        <RoundedBox args={[1.7, 0.34, 0.05]} radius={0.02} castShadow>
          <meshStandardMaterial color="#141210" roughness={0.35} metalness={0.5} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.032]}
          fontSize={0.13}
          color={accent}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.15}
          font="/fonts/Geist-Regular.ttf"
        >
          {name.toUpperCase()}
        </Text>
      </group>
    </group>
  )
}

/**
 * Impact signal shared with the CameraRig: while a GLB dealer's hit
 * "connects", this drives a brief, subtle camera shake.
 */
export const sahurImpact = { shake: 0 }

const easeOutCubicEnv = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutEnv = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Generic GLB dealer character. Idles with a slow sway; lunges forward
 * when the player loses a round. Used for all GLB-based dealer personas.
 */
export function GLBCharacter({
  glb,
  name,
  accent,
  reducedMotion,
}: {
  glb: string
  name: string
  accent: string
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  const anim = useRef({ t: 0, swing: -1, wait: 0, lastRound: -1 })

  const gltf = useLoader(GLTFLoader, glb)

  const { scene, scale, yOffset } = useMemo(() => {
    const scene = gltf.scene.clone()
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = false
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const height = Math.max(size.y, 0.0001)
    const scale = 1.65 / height
    // Place feet at y=0 within the group, then the group itself sits at y=-0.05
    // (just below the table surface at y=0) so the character stands behind the table
    const yOffset = -box.min.y * scale
    return { scene, scale, yOffset }
  }, [gltf])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const a = anim.current
    if (!reducedMotion) a.t += delta

    g.position.y = 0.05 + (reducedMotion ? 0 : Math.sin(a.t * 1.1) * 0.02)
    g.rotation.z = reducedMotion ? 0 : Math.sin(a.t * 0.8) * 0.02
    g.rotation.y = reducedMotion ? 0 : Math.sin(a.t * 0.5) * 0.05

    const gs = useGame.getState()
    const isLoss = gs.phase === 'RESULT' && gs.banner?.tone === 'red'
    if (isLoss && gs.roundId !== a.lastRound) {
      a.lastRound = gs.roundId
      a.swing = 0
      a.wait = reducedMotion ? 0 : 0.32
    }

    const m = model.current
    if (!m || a.swing < 0) return

    if (a.wait > 0) {
      a.wait -= delta
      return
    }

    a.swing = Math.min(1, a.swing + delta / (a.swing < 0.35 ? 0.3 : 0.55))
    const p = a.swing
    const amount =
      p < 0.35 ? easeOutCubicEnv(p / 0.35) : 1 - easeInOutEnv((p - 0.35) / 0.65)

    if (!reducedMotion) {
      m.rotation.x = amount * 0.45
      m.position.z = amount * 0.5
      m.position.y = -amount * 0.12
      sahurImpact.shake = p > 0.28 && p < 0.5 ? 0.035 : 0
    }

    if (a.swing >= 1) {
      a.swing = -1
      m.rotation.x = 0
      m.position.z = 0
      m.position.y = 0
      sahurImpact.shake = 0
    }
  })

  return (
    <group ref={group} position={[0, -0.65, -3.2]}>
      <group ref={model}>
        <primitive object={scene} scale={scale} position={[0, yOffset, 0]} />
      </group>
      <group position={[0, -0.6, 1.15]} rotation={[-0.5, 0, 0]}>
        <RoundedBox args={[1.7, 0.34, 0.05]} radius={0.02} castShadow>
          <meshStandardMaterial color="#141210" roughness={0.35} metalness={0.5} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.032]}
          fontSize={0.11}
          color={accent}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
          font="/fonts/Geist-Regular.ttf"
        >
          {name.toUpperCase()}
        </Text>
      </group>
    </group>
  )
}

/** Original Tung Tung Tung Sahur using FBX + texture. */
export function SahurCharacter({
  name,
  accent,
  reducedMotion,
}: {
  name: string
  accent: string
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  const anim = useRef({ t: 0, swing: -1, wait: 0, lastRound: -1 })

  const fbx = useLoader(FBXLoader, '/models/tung-sahur.fbx')
  const texture = useLoader(THREE.TextureLoader, '/models/tung-sahur-texture.png')

  const { scene, scale, yOffset } = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = true
    const scene = fbx.clone()
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = false
        mesh.material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.75,
          metalness: 0.02,
        })
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const height = Math.max(size.y, 0.0001)
    const scale = 2.1 / height
    const yOffset = -box.min.y * scale
    return { scene, scale, yOffset }
  }, [fbx, texture])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const a = anim.current
    if (!reducedMotion) a.t += delta
    g.position.y = 0.05 + (reducedMotion ? 0 : Math.sin(a.t * 1.1) * 0.02)
    g.rotation.z = reducedMotion ? 0 : Math.sin(a.t * 0.8) * 0.02
    g.rotation.y = reducedMotion ? 0 : Math.sin(a.t * 0.5) * 0.05
    const gs = useGame.getState()
    const isLoss = gs.phase === 'RESULT' && gs.banner?.tone === 'red'
    if (isLoss && gs.roundId !== a.lastRound) {
      a.lastRound = gs.roundId
      a.swing = 0
      a.wait = 0.32
    }
    const m = model.current
    if (!m || a.swing < 0) return
    if (a.wait > 0) { a.wait -= delta; return }
    a.swing = Math.min(1, a.swing + delta / (a.swing < 0.35 ? 0.3 : 0.55))
    const p = a.swing
    const amount = p < 0.35 ? easeOutCubicEnv(p / 0.35) : 1 - easeInOutEnv((p - 0.35) / 0.65)
    if (!reducedMotion) {
      m.rotation.x = amount * 0.45
      m.position.z = amount * 0.5
      m.position.y = -amount * 0.12
      sahurImpact.shake = p > 0.28 && p < 0.5 ? 0.035 : 0
    }
    if (a.swing >= 1) {
      a.swing = -1
      m.rotation.x = 0
      m.position.z = 0
      m.position.y = 0
      sahurImpact.shake = 0
    }
  })

  return (
    <group ref={group} position={[0, 0.05, -3.5]}>
      <group ref={model}>
        <primitive object={scene} scale={scale} position={[0, yOffset, 0]} />
      </group>
      <group position={[0, -0.6, 1.15]} rotation={[-0.5, 0, 0]}>
        <RoundedBox args={[1.7, 0.34, 0.05]} radius={0.02} castShadow>
          <meshStandardMaterial color="#141210" roughness={0.35} metalness={0.5} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.032]}
          fontSize={0.11}
          color={accent}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
          font="/fonts/Geist-Regular.ttf"
        >
          {name.toUpperCase()}
        </Text>
      </group>
    </group>
  )
}

/** Small instanced gold sparkle burst for wins. */
export function WinSparkles({ active }: { active: boolean }) {
  const points = useRef<THREE.Points>(null)
  const progress = useRef(0)
  const COUNT = 60

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const velocities: THREE.Vector3[] = []
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2
      const r = 0.1 + Math.random() * 0.25
      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * r * (0.5 + Math.random()),
          0.8 + Math.random() * 0.9,
          Math.sin(angle) * r * (0.5 + Math.random()),
        ),
      )
    }
    return { positions, velocities }
  }, [])

  useFrame((_, delta) => {
    const p = points.current
    if (!p) return
    if (!active) {
      progress.current = 0
      p.visible = false
      return
    }
    p.visible = progress.current < 1
    if (progress.current >= 1) return
    progress.current = Math.min(1, progress.current + delta / 1.4)
    const t = progress.current
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < COUNT; i++) {
      const v = velocities[i]
      attr.setXYZ(
        i,
        v.x * t * 2,
        v.y * t - 1.4 * t * t, // gravity arc
        v.z * t * 2,
      )
    }
    attr.needsUpdate = true
    const mat = p.material as THREE.PointsMaterial
    mat.opacity = 1 - t
  })

  return (
    <points ref={points} position={[0, 0.3, 1.05]} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={GOLD} size={0.045} transparent opacity={1} sizeAttenuation />
    </points>
  )
}
