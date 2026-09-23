import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { buildPlayer, type Loadout } from '../core/items/loadout'
import { timeOfWeek } from '../core/world/clock'
import { createAtlas, loadImage, type Atlas } from '../render/atlas'
import { PALETTE } from '../render/palette'
import { TILESET_URL } from '../render/tiles'
import { CombatView } from './combat/CombatView'
import { DEMO_ITEMS, DEMO_TOTAL_SLOTS, DEMO_UNLOCKED_SLOTS, DEMO_WEAPON } from './demo/demoLoadout'
import { createDemoMap } from './demo/demoMap'
import { demoReducer, initDemoState } from './demo/demoState'
import { Inventory } from './Inventory'
import { MapCanvas } from './MapCanvas'
import { PixelIcon } from './PixelIcon'
import { StatPanel } from './StatPanel'
import { Timeline } from './Timeline'
import { STAGE_H, STAGE_W, useStageScale } from './useStageScale'

/** Map canvas in art pixels: .map-area (384×224) minus its 1px border. */
const MAP_W = 382
const MAP_H = 222
const DEMO_SEED = 1337
const DEMO_LOADOUT: Loadout = { weapon: DEMO_WEAPON, items: DEMO_ITEMS }

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
  const reducer = useMemo(() => demoReducer(map, DEMO_LOADOUT), [map])
  const [state, dispatch] = useReducer(reducer, map, (m) => initDemoState(m, DEMO_LOADOUT))
  const { player, step, revealed, battle, gameOver } = state
  const time = timeOfWeek(step)
  const heroStats = useMemo(() => buildPlayer(DEMO_LOADOUT).stats, [])
  const visibleMap = useMemo(() => ({ ...map, pois: map.pois.filter((_, i) => !state.defeated.has(i)) }), [map, state.defeated])
  const finishBattle = useCallback(() => dispatch({ type: 'finishBattle' }), [])

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
      if (key === 'r') return dispatch({ type: 'restart' })
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
            <StatPanel stats={{ ...heroStats, health: state.hp, maxHealth: heroStats.maxHp, gold: state.gold }} />
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
            <MapCanvas atlas={atlas} map={visibleMap} player={player} revealed={revealed} width={MAP_W} height={MAP_H} stageScale={scale} />
            <div className="map-caption">
              {time.phase} {time.day} · {time.stepsLeftInSegment} steps left
            </div>
            {loadError && <div className="error">{loadError}</div>}
          </main>
          {battle && <CombatView key={battle.id} battle={battle} onFinish={finishBattle} />}
          {gameOver && (
            <div className="panel game-over" role="dialog" aria-label="Game over">
              <div className="game-over-title">You have fallen</div>
              <button type="button" onClick={() => dispatch({ type: 'restart' })} autoFocus>
                Try again (R)
              </button>
            </div>
          )}
          {crt && <div className="crt" aria-hidden="true" />}
        </div>
      </div>
    </div>
  )
}
