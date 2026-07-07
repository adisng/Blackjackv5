'use client'

import { memo, Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Card3D } from '@/components/cards/card-3d'
import {
  CardShoe,
  ChipStack,
  DealerPresence,
  PendantLamp,
  TableSurface,
  WinSparkles,
} from './table-environment'
import { useGame } from '@/lib/game/store'
import { getDealer } from '@/lib/game/dealers'
import { FELT_COLORS, usePrefersReducedMotion, useSettings } from '@/lib/game/settings-store'

const CARD_SPACING = 0.34
const DEAL_STAGGER = 0.22

/**
 * Fixed over-the-shoulder camera with a subtle idle drift.
 * On narrow (portrait) screens the camera pulls back and rises so the
 * full table — dealer row to betting circle — stays in frame.
 */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const t = useRef(0)

  useFrame((_, delta) => {
    if (!reducedMotion) t.current += delta
    const drift = reducedMotion ? 0 : Math.sin(t.current * 0.25) * 0.06
    const driftY = reducedMotion ? 0 : Math.sin(t.current * 0.18) * 0.03

    // 1 on wide screens, up to ~1.8 on tall portrait phones
    const aspect = size.width / Math.max(1, size.height)
    const k = THREE.MathUtils.clamp(1.15 / aspect, 1, 1.85)

    const targetX = drift * 1.2
    const targetY = 4.55 * Math.pow(k, 0.62) + driftY
    const targetZ = 4.9 * k

    // Smooth toward target so resizes/rotations never snap
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 8, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 8, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 8, delta)
    // Aim between the dealer row and the player's cards so the player's
    // hand sits in the clear middle of the screen — never behind the HUD.
    camera.lookAt(0, -0.35, 0.7)
  })

  return null
}

function SceneLights({ accent, shadowSize }: { accent: string; shadowSize: number }) {
  return (
    <>
      {/* Key: warm pendant light from above-front */}
      <spotLight
        position={[0, 4, -0.4]}
        angle={0.75}
        penumbra={0.6}
        intensity={65}
        color="#ffe4b8"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-bias={-0.0004}
        target-position={[0, 0, -0.4]}
      />
      {/* Dim rim light from behind the dealer, tinted by dealer accent */}
      <directionalLight position={[-3, 2.5, -6]} intensity={0.9} color={accent} />
      {/* Soft ambient fill so nothing goes pure black */}
      <ambientLight intensity={0.32} color="#b8c0cc" />
    </>
  )
}

/**
 * Static scenery: table, shoe, lamp, dealer bust.
 * Memoized and kept OUTSIDE the per-round keyed group so it never
 * remounts between hands (remounting it caused a visible hitch).
 */
const StaticEnvironment = memo(function StaticEnvironment() {
  const dealerId = useSettings((s) => s.dealerId)
  const feltColor = useSettings((s) => s.feltColor)
  const dealer = getDealer(dealerId)
  const felt = FELT_COLORS[feltColor]

  return (
    <group>
      <TableSurface feltColor={felt.felt} trimColor={felt.trim} />
      <CardShoe />
      <PendantLamp />
      <DealerPresence
        name={dealer.name}
        accent={dealer.accent}
        portraitBg={dealer.portraitBg}
        portraitFg={dealer.portraitFg}
      />
    </group>
  )
})

function GameElements({ reducedMotion }: { reducedMotion: boolean }) {
  const playerHands = useGame((s) => s.playerHands)
  const activeHandIndex = useGame((s) => s.activeHandIndex)
  const dealerCards = useGame((s) => s.dealerCards)
  const holeRevealed = useGame((s) => s.holeRevealed)
  const bet = useGame((s) => s.bet)
  const phase = useGame((s) => s.phase)
  const banner = useGame((s) => s.banner)
  const roundId = useGame((s) => s.roundId)

  const showWinSparkles =
    phase === 'RESULT' && banner?.tone === 'gold' && !reducedMotion

  // Layout for player hands: single hand centered; split hands side by side
  const handOffsets = useMemo(() => {
    const n = playerHands.length
    if (n <= 1) return [0]
    const spread = n > 2 ? 1.55 : 2.1
    return playerHands.map((_, i) => (i - (n - 1) / 2) * spread)
  }, [playerHands])

  const currentBetTotal =
    phase === 'BETTING' ? bet : playerHands.reduce((sum, h) => sum + h.bet, 0)

  return (
    <>
      {/* Cards + chips remount per round so deal animations restart cleanly */}
      <group key={roundId}>
        {/* Dealer cards row */}
        {dealerCards.map((card, i) => (
          <Card3D
            key={card.id}
            card={card}
            position={[(i - (dealerCards.length - 1) / 2) * CARD_SPACING * 1.9, 0.08, -1.9]}
            faceUp={i === 0 ? holeRevealed : true}
            delay={i < 2 ? (i === 0 ? DEAL_STAGGER : DEAL_STAGGER * 3) : 0}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Player hands */}
        {playerHands.map((hand, hi) => {
          const isBustShaking = hand.busted && phase !== 'RESULT'
          return (
            <group key={hi} position={[handOffsets[hi], 0, 0]}>
              {hand.cards.map((card, ci) => (
                <Card3D
                  key={card.id}
                  card={card}
                  position={[
                    (ci - (hand.cards.length - 1) / 2) * CARD_SPACING,
                    0.08 + ci * 0.012,
                    1.9 + ci * 0.06,
                  ]}
                  faceUp
                  delay={hand.fromSplit ? 0 : ci === 0 ? 0 : ci === 1 ? DEAL_STAGGER * 2 : 0}
                  shakeAmp={isBustShaking && !reducedMotion ? 0.02 : 0}
                  reducedMotion={reducedMotion}
                />
              ))}
              {/* Active hand marker during split play */}
              {playerHands.length > 1 && hi === activeHandIndex && phase === 'PLAYER_TURN' && (
                <mesh position={[0, 0.055, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.08, 0.12, 24]} />
                  <meshStandardMaterial color="#C9A227" emissive="#C9A227" emissiveIntensity={0.6} />
                </mesh>
              )}
            </group>
          )
        })}

        {/* Bet chips in the betting circle */}
        <ChipStack amount={currentBetTotal} position={[0, 0.05, 1.05]} />

        <WinSparkles active={showWinSparkles} />
      </group>

      <StaticEnvironment />
    </>
  )
}

export function TableScene() {
  const reducedMotion = usePrefersReducedMotion()
  const dealerId = useSettings((s) => s.dealerId)
  const dealer = getDealer(dealerId)

  // Tune renderer once per mount for the current device
  const { dpr, antialias, shadowSize } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { dpr: [1, 1.75] as [number, number], antialias: true, shadowSize: 1024 }
    }
    const isSmall = window.innerWidth < 768
    const highDpr = window.devicePixelRatio > 1.5
    return {
      // High-density phones already supersample — cap DPR and skip MSAA there
      dpr: (isSmall ? [1, 1.5] : [1, 1.75]) as [number, number],
      antialias: !(isSmall && highDpr),
      shadowSize: isSmall ? 512 : 1024,
    }
  }, [])

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        shadows="percentage"
        camera={{ position: [0, 4.55, 4.9], fov: 42 }}
        gl={{ antialias, powerPreference: 'high-performance', stencil: false }}
        dpr={dpr}
      >
        <color attach="background" args={['#0B0C0E']} />
        <fog attach="fog" args={['#0B0C0E', 9, 18]} />
        <Suspense fallback={null}>
          <CameraRig reducedMotion={reducedMotion} />
          <SceneLights accent={dealer.accent} shadowSize={shadowSize} />
          <GameElements reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
      {/* Screen-space vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  )
}
