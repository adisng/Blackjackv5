'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { GameHud } from '@/components/hud/game-hud'
import { LoadingScreen } from '@/components/loading-screen'
import { useGame } from '@/lib/game/store'

const TableScene = dynamic(
  () => import('@/components/table/table-scene').then((m) => m.TableScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Setting the table
        </p>
      </div>
    ),
  }
)

export function TableRoom() {
  const [loaded, setLoaded] = useState(false)
  const enterTable = useGame((s) => s.enterTable)
  const phase = useGame((s) => s.phase)

  // Start the round flow when the player sits down
  useEffect(() => {
    if (phase === 'IDLE') enterTable()
  }, [phase, enterTable])

  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      {!loaded && <LoadingScreen onDone={handleLoaded} />}
      <TableScene />
      <GameHud />
    </main>
  )
}
