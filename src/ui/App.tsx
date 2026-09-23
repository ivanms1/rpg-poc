import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { setProgress, type Equipped } from '../core/items/loadout'
import { heroCombatant } from '../core/run/hero'
import { createRun, runReducer } from '../core/run/reducer'
import type { RunAction } from '../core/run/types'
import { timeOfWeek } from '../core/world/clock'
import { CONTENT } from '../data/content'
import { createAtlas, loadImage, type Atlas } from '../render/atlas'
import { PALETTE } from '../render/palette'
import { TILESET_URL } from '../render/tiles'
import { CombatView } from './combat/CombatView'
import { Inventory } from './Inventory'
import { WorldCanvas } from './map/WorldCanvas'
import { PixelIcon } from './PixelIcon'
import { BossPreview, ChoiceDialog, EndScreen, MessageDialog } from './run/Dialogs'
import { StatPanel } from './StatPanel'
import { Timeline } from './Timeline'
import { STAGE_H, STAGE_W, useStageScale } from './useStageScale'

/** Map canvas in art pixels: .map-area (384×224) minus its 1px border. */
const MAP_W = 382
const MAP_H = 222
const MAX_SLOTS = 8

const MOVES: Record<string, readonly [number, number]> = {
  w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
  arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
}

const reducer = runReducer(CONTENT)

/** ?seed=123 replays a specific run; otherwise every page load is a new one. */
const initialSeed = (): number => {
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'))
  return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Math.floor(Math.random() * 1_000_000_000)
}

export function App() {
  const scale = useStageScale()
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [crt, setCrt] = useState(true)
  const [showBoss, setShowBoss] = useState(false)
  const [state, dispatch] = useReducer(reducer, undefined, () => createRun(initialSeed(), CONTENT))
  const { hero, screen, week, step } = state
  const time = timeOfWeek(step)
  const stats = useMemo(() => heroCombatant(hero, CONTENT.sets).stats, [hero])
  const describe = useCallback(
    (equipped: Equipped, isWeapon: boolean): string[] => {
      const loadout = { weapon: hero.weapon, items: hero.items, edge: hero.edge }
      const sets = setProgress(loadout, CONTENT.sets, equipped.item.id).map(
        ({ set, owned, total }) => `${owned === total ? '✓ ' : ''}${set.name} (${owned}/${total}): ${set.text}`,
      )
      if (!isWeapon) return sets
      const edge = hero.edge ? [`Edge — ${hero.edge.name}: ${hero.edge.text}`] : []
      const oils = hero.oils.length > 0 ? [`Oils: ${hero.oils.map((o) => `+1 ${o}`).join(', ')}`] : []
      return [...edge, ...oils, ...sets]
    },
    [hero],
  )
  const boss = CONTENT.bosses.find((b) => b.id === state.bosses[week - 1])

  const act = useCallback((action: RunAction) => dispatch(action), [])
  const newRun = useCallback(() => {
    const seed = Math.floor(Math.random() * 1_000_000_000)
    window.history.replaceState(null, '', `?seed=${seed}`)
    window.location.reload()
  }, [])

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
      if (screen.kind === 'battle') return
      if ((screen.kind === 'gameOver' || screen.kind === 'victory') && key === 'r') return newRun()
      if (key === 'tab') {
        e.preventDefault()
        return setShowBoss((open) => screen.kind === 'map' && !open)
      }
      if (key === 'escape') {
        setShowBoss(false)
        return act({ type: 'dismiss' })
      }
      if (screen.kind === 'choice' && ['1', '2', '3'].includes(key)) return act({ type: 'choose', index: Number(key) - 1 })
      const move = MOVES[key]
      if (!move || showBoss) return
      e.preventDefault()
      act({ type: 'move', dx: move[0], dy: move[1] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, newRun, screen.kind, showBoss])

  return (
    <div className="viewport">
      <div className="stage-wrap" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
        <div className="stage" style={{ transform: `scale(${scale})` }} data-testid="stage">
          <aside className="sidebar">
            <StatPanel stats={{ ...stats, health: hero.hp, maxHealth: stats.maxHp, gold: hero.gold }} />
            <Inventory
              weapon={hero.weapon}
              items={hero.items}
              total={MAX_SLOTS}
              onDiscard={(slot) => act({ type: 'discard', slot })}
              onReorder={(from, to) => act({ type: 'reorder', from, to })}
              describe={describe}
            />
          </aside>
          <header className="panel topbar">
            <span className="week-label">Week {week}</span>
            <Timeline step={step} />
            <button type="button" className="boss-preview" title="Boss (Tab)" aria-label="Boss preview" onClick={() => setShowBoss((o) => !o)}>
              <PixelIcon icon="skull" color={PALETTE.enemy} scale={2} />
            </button>
            <span className="key-hint key-hint-red">Tab</span>
          </header>
          <main className={`panel map-area${time.phase === 'night' ? ' is-night' : ''}`}>
            <WorldCanvas atlas={atlas} world={state.world} player={state.player} revealed={state.revealed} width={MAP_W} height={MAP_H} stageScale={scale} />
            <div className="map-caption">
              {time.phase} {time.day} · {time.stepsLeftInSegment} steps left · seed {state.seed}
            </div>
            {loadError && <div className="error">{loadError}</div>}
          </main>

          {screen.kind === 'battle' && <CombatView key={screen.battle.id} battle={screen.battle} onFinish={() => act({ type: 'finishBattle' })} />}
          {screen.kind === 'choice' && (
            <ChoiceDialog
              title={screen.title}
              options={screen.options}
              notice={screen.notice}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {screen.kind === 'message' && <MessageDialog title={screen.title} text={screen.text} onClose={() => act({ type: 'dismiss' })} />}
          {showBoss && screen.kind === 'map' && boss && (
            <BossPreview
              boss={boss}
              week={week}
              onClose={() => setShowBoss(false)}
              onFight={() => {
                setShowBoss(false)
                act({ type: 'fightBoss' })
              }}
            />
          )}
          {(screen.kind === 'gameOver' || screen.kind === 'victory') && (
            <EndScreen victory={screen.kind === 'victory'} week={week} gold={hero.gold} seed={state.seed} onRestart={newRun} />
          )}
          {crt && <div className="crt" aria-hidden="true" />}
        </div>
      </div>
    </div>
  )
}
