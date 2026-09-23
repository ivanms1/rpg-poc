import { useEffect, useMemo, useReducer, useState } from 'react'
import { timeOfWeek } from '../core/world/clock'
import { createAtlas, loadImage, type Atlas } from '../render/atlas'
import { TILESET_URL } from '../render/tiles'
import { createDemoMap } from './demo/demoMap'
import { demoReducer, initDemoState } from './demo/demoState'
import { DEMO_ITEMS, DEMO_TOTAL_SLOTS, DEMO_UNLOCKED_SLOTS, DEMO_WEAPON } from './demo/demoItems'
import { Inventory } from './Inventory'
import { MapCanvas } from './MapCanvas'
import { StatPanel } from './StatPanel'
import { Timeline } from './Timeline'
import { STAGE_H, STAGE_W, useStageScale } from './useStageScale'
import { PixelIcon } from './PixelIcon'
import { PALETTE } from '../render/palette'

/** Map canvas in art pixels: .map-area (384×224) minus its 1px border. */
const MAP_W = 382
const MAP_H = 222
const DEMO_SEED = 1337

const MOVES: Record<string, readonly [number, number]> = {
  w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
  arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
}

export function App() {
  const scale = useStageScale()
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [crt, setCrt] = useState(true)
  const map = useMemo(() => createDemoMap(DEMO_SEED), [])
  const reducer = useMemo(() => demoReducer(map), [map])
  const [{ player, step, revealed }, dispatch] = useReducer(reducer, map, initDemoState)
  const time = timeOfWeek(step)

  useEffect(() => {
    loadImage(TILESET_URL)
      .then((img) => setAtlas(createAtlas(img)))
      .catch((err: unknown) => {
        console.error(err)
        setLoadError('Could not load the tileset. Try reloading the page.')
      })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'c') return setCrt((on) => !on)
      const move = MOVES[key]
      if (!move) return
      e.preventDefault()
      dispatch({ type: 'move', dx: move[0], dy: move[1] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="viewport">
      <div className="stage-wrap" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
        <div className="stage" style={{ transform: `scale(${scale})` }} data-testid="stage">
          <aside className="sidebar">
            <StatPanel stats={{ health: 16, maxHealth: 16, attack: 1, armor: 4, speed: -2, gold: 3 }} />
            <Inventory weapon={DEMO_WEAPON} items={DEMO_ITEMS} unlocked={DEMO_UNLOCKED_SLOTS} total={DEMO_TOTAL_SLOTS} />
          </aside>
          <header className="panel topbar">
            <span className="key-hint">Shf</span>
            <Timeline step={step} />
            <span className="boss-preview" title="Boss (Tab)">
              <PixelIcon icon="skull" color={PALETTE.enemy} scale={2} />
            </span>
            <span className="key-hint key-hint-red">Tab</span>
          </header>
          <main className={`panel map-area${time.phase === 'night' ? ' is-night' : ''}`}>
            <MapCanvas atlas={atlas} map={map} player={player} revealed={revealed} width={MAP_W} height={MAP_H} stageScale={scale} />
            <div className="map-caption">
              {time.phase} {time.day} · {time.stepsLeftInSegment} steps left
            </div>
            {loadError && <div className="error">{loadError}</div>}
          </main>
          {crt && <div className="crt" aria-hidden="true" />}
        </div>
      </div>
    </div>
  )
}
