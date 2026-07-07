'use client'

import { memo, Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { Card3D } from '@/components/cards/card-3d'
import {
  CardShoe,
  ChipStack,
  DealerPresence,
  GLBCharacter,
  PendantLamp,
  SahurCharacter,
  sahurImpact,
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
const INTRO_POS: [number, number, number] = [0, 1.75, -1.55]
const INTRO_LOOK: [number, number, number] = [0, 1.55, -3.4]
// Loss cutscene: close-up right in front of Sahur so his hit fills the frame
const HIT_POS: [number, number, number] = [0, 1.65, -1.35]
const HIT_LOOK: [number, number, number] = [0, 1.45, -3.3]
const HIT_SCENE_DURATION = 1.25
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function CameraRig({ reducedMotion, sahur }: { reducedMotion: boolean; sahur: boolean }) {
  const { camera, size } = useThree()
  const t = useRef(0)
  // One-time cinematic intro (Sahur dealer only): hold a close-up until the
  // first chip/deal tap, then dolly out to the standard table framing.
  const intro = useRef<{ mode: 'intro' | 'transition' | 'idle'; p: number }>({
    mode: sahur ? 'intro' : 'idle',
    p: 0,
  })
  // Short loss cutscene: zoom into Sahur, he hits, snap straight back.
  const cut = useRef({ p: -1, lastRound: -1 })

  useFrame((_, delta) => {
    if (!reducedMotion) t.current += delta
    const drift = reducedMotion ? 0 : Math.sin(t.current * 0.25) * 0.06
    const driftY = reducedMotion ? 0 : Math.sin(t.current * 0.18) * 0.03

    // 1 on wide screens, up to ~1.3 on tall portrait phones.
    // Kept tight so the camera stays close and cards read large.
    const aspect = size.width / Math.max(1, size.height)
    const isMobile = aspect < 0.75

    // On mobile: lower, closer, steeper angle focused on the card area
    // On desktop: standard over-the-shoulder view
    const targetX = drift * 1.2
    const targetY = isMobile ? 5.0 + driftY : 7.0 + driftY
    const targetZ = isMobile ? 5.2 : 6.5
    const lookY = isMobile ? 0.0 : 0.0
    const lookZ = isMobile ? -0.2 : -0.1

    const st = intro.current
    if (st.mode === 'intro') {
      const gs = useGame.getState()
      if (gs.bet > 0 || gs.phase !== 'BETTING') {
        st.mode = 'transition'
      } else {
        camera.position.set(INTRO_POS[0], INTRO_POS[1], INTRO_POS[2])
        camera.lookAt(INTRO_LOOK[0], INTRO_LOOK[1], INTRO_LOOK[2])
        return
      }
    }
    if (st.mode === 'transition') {
      // Single eased dolly-out from the close-up to the gameplay camera
      st.p = Math.min(1, st.p + delta / 1.05)
      const e = easeInOut(st.p)
      camera.position.set(
        THREE.MathUtils.lerp(INTRO_POS[0], targetX, e),
        THREE.MathUtils.lerp(INTRO_POS[1], targetY, e),
        THREE.MathUtils.lerp(INTRO_POS[2], targetZ, e),
      )
      camera.lookAt(
        THREE.MathUtils.lerp(INTRO_LOOK[0], 0, e),
        THREE.MathUtils.lerp(INTRO_LOOK[1], lookY, e),
        THREE.MathUtils.lerp(INTRO_LOOK[2], lookZ, e),
      )
      if (st.p >= 1) st.mode = 'idle'
      return
    }

    // --- Loss cutscene (GLB dealers): dolly in, take the hit, snap back ---
    if (sahur) {
      const gs = useGame.getState()
      const isLoss = gs.phase === 'RESULT' && gs.banner?.tone === 'red'
      if (isLoss && gs.roundId !== cut.current.lastRound) {
        cut.current.lastRound = gs.roundId
        cut.current.p = 0
      }
      if (cut.current.p >= 0) {
        cut.current.p = Math.min(1, cut.current.p + delta / HIT_SCENE_DURATION)
        const p = cut.current.p
        if (p >= 1) {
          // Return to the game instantly — hard cut, no easing back
          cut.current.p = -1
          camera.position.set(targetX, targetY, targetZ)
          camera.lookAt(0, lookY, lookZ)
          return
        }
        // Fast eased zoom in over the first quarter, then hold for the hit
        const e = easeInOut(Math.min(1, p / 0.28))
        const hitShake =
          sahurImpact.shake > 0 && !reducedMotion ? (Math.random() - 0.5) * 2 * sahurImpact.shake * 2.2 : 0
        camera.position.set(
          THREE.MathUtils.lerp(targetX, HIT_POS[0], e) + hitShake,
          THREE.MathUtils.lerp(targetY, HIT_POS[1], e) + hitShake * 0.7,
          THREE.MathUtils.lerp(targetZ, HIT_POS[2], e),
        )
        camera.lookAt(
          THREE.MathUtils.lerp(0, HIT_LOOK[0], e),
          THREE.MathUtils.lerp(-0.3, HIT_LOOK[1], e),
          THREE.MathUtils.lerp(-0.35, HIT_LOOK[2], e),
        )
        return
      }
    }

    // Brief impact shake driven by the Sahur bat swing
    const shake = sahurImpact.shake > 0 && !reducedMotion
      ? (Math.random() - 0.5) * 2 * sahurImpact.shake
      : 0

    // Smooth toward target so resizes/rotations never snap
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 8, delta) + shake
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 8, delta) + shake * 0.6
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 8, delta)
    camera.lookAt(0, lookY, lookZ)
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
      {/* Face light: soft front fill aimed at the dealer */}
      <pointLight position={[0, 2.2, -2.2]} intensity={8} color="#ffdd88" distance={4} decay={2} />
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
const StaticEnvironment = memo(function StaticEnvironment({
  reducedMotion,
}: {
  reducedMotion: boolean
}) {
  const dealerId = useSettings((s) => s.dealerId)
  const feltColor = useSettings((s) => s.feltColor)
  const dealer = getDealer(dealerId)
  const felt = FELT_COLORS[feltColor]

  return (
    <group>
      <TableSurface feltColor={felt.felt} trimColor={felt.trim} />
      <CardShoe />
      <PendantLamp />
      {dealer.id === 'tung-sahur' ? (
        <SahurCharacter name={dealer.name} accent={dealer.accent} reducedMotion={reducedMotion} />
      ) : dealer.glb ? (
        <GLBCharacter glb={dealer.glb} name={dealer.name} accent={dealer.accent} reducedMotion={reducedMotion} />
      ) : (
        <DealerPresence
          name={dealer.name}
          accent={dealer.accent}
          portraitBg={dealer.portraitBg}
          portraitFg={dealer.portraitFg}
        />
      )}
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

      <StaticEnvironment reducedMotion={reducedMotion} />
    </>
  )
}

/**
 * Screen-space red vignette flash for the Sahur loss cutscene.
 * Keyed by roundId so the CSS animation restarts on every fresh loss.
 */
function LossVignette({ active }: { active: boolean }) {
  const phase = useGame((s) => s.phase)
  const tone = useGame((s) => s.banner?.tone)
  const roundId = useGame((s) => s.roundId)

  if (!active || phase !== 'RESULT' || tone !== 'red') return null
  return <div key={roundId} className="loss-vignette pointer-events-none absolute inset-0" />
}

export function TableScene() {
  const reducedMotion = usePrefersReducedMotion()
  const dealerId = useSettings((s) => s.dealerId)
  const dealer = getDealer(dealerId)

  const isCutsceneDealer = dealer.id === 'tung-sahur' || !!dealer.glb
  const { dpr, antialias, shadowSize, fov } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { dpr: [1, 1.75] as [number, number], antialias: true, shadowSize: 1024, fov: 37 }
    }
    const isSmall = window.innerWidth < 768
    const highDpr = window.devicePixelRatio > 1.5
    return {
      dpr: (isSmall ? [1, 1.5] : [1, 1.75]) as [number, number],
      antialias: !(isSmall && highDpr),
      shadowSize: isSmall ? 512 : 1024,
      fov: isSmall ? 58 : 46,
    }
  }, [])

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        shadows="percentage"
        camera={{ position: [0, 4.75, 4.7], fov }}
        gl={{ antialias, powerPreference: 'high-performance', stencil: false }}
        dpr={dpr}
      >
        <color attach="background" args={['#0B0C0E']} />
        <fog attach="fog" args={['#0B0C0E', 9, 18]} />
        <Suspense fallback={null}>
          <CameraRig reducedMotion={reducedMotion} sahur={isCutsceneDealer} />
          <SceneLights accent={dealer.accent} shadowSize={shadowSize} />
          <GameElements reducedMotion={reducedMotion} />
        </Suspense>
        {/* Dynamically lowers resolution during motion to hold 60fps */}
        <AdaptiveDpr pixelated />
      </Canvas>
      {/* Screen-space vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/* Red flash synced to the Sahur loss cutscene */}
      <LossVignette active={isCutsceneDealer} />
    </div>
  )
}
