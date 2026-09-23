import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { setProgress, type Equipped } from '../core/items/loadout'
import { heroCombatant } from '../core/run/hero'
import { runReducer } from '../core/run/reducer'
import { isSaveable } from '../core/run/save'
import type { RunAction, RunState } from '../core/run/types'
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
import { CraftDialog, ForgeDialog, OilDialog, PickDialog, ShopDialog } from './run/ShopDialogs'
import { clearSave, writeSave } from './save/storage'
import { StatPanel } from './StatPanel'
import { Stage } from './Stage'
import { Timeline } from './Timeline'

/** Map canvas in art pixels: .map-area (384×224) minus its 1px border. */
const MAP_W = 382
const MAP_H = 222
const MAX_SLOTS = 8

const MOVES: Record<string, readonly [number, number]> = {
  w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
  arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
}

const reducer = runReducer(CONTENT)

interface Props {
  readonly initial: RunState
  /** Leave the run (back to the title screen). */
  readonly onExit: () => void
}

/** One run in progress. Autosaves between battles; a finished run clears the save. */
export function Game({ initial, onExit }: Props) {
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showBoss, setShowBoss] = useState(false)
  const [state, dispatch] = useReducer(reducer, initial)
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
  const finished = screen.kind === 'gameOver' || screen.kind === 'victory'

  useEffect(() => {
    if (isSaveable(state)) writeSave(state)
    else if (state.screen.kind === 'gameOver' || state.screen.kind === 'victory') clearSave()
  }, [state])

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
      if (screen.kind === 'battle') return
      if (finished) {
        if (key === 'r') onExit()
        return
      }
      if (key === 'tab') {
        e.preventDefault()
        return setShowBoss((open) => screen.kind === 'map' && !open)
      }
      if (key === 'escape') {
        setShowBoss(false)
        return act({ type: 'dismiss' })
      }
      const digit = Number(key)
      if (Number.isInteger(digit) && digit >= 1) {
        if (screen.kind === 'shop') return act({ type: 'buy', index: digit - 1 })
        if (['choice', 'forge', 'oil', 'craft', 'pick'].includes(screen.kind)) return act({ type: 'choose', index: digit - 1 })
      }
      if (screen.kind === 'shop' && key === 'r') return act({ type: 'reroll' })
      if (screen.kind === 'shop' && key === 'h') return act({ type: 'haggle' })
      const move = MOVES[key]
      if (!move || showBoss) return
      e.preventDefault()
      act({ type: 'move', dx: move[0], dy: move[1] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, finished, onExit, screen.kind, showBoss])

  return (
    <Stage>
      {(scale) => (
        <>
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
          {screen.kind === 'shop' && (
            <ShopDialog
              title={screen.title}
              stock={screen.stock}
              gold={hero.gold}
              rerollCost={screen.rerollCost}
              canHaggle={screen.canHaggle}
              notice={screen.notice}
              onBuy={(index) => act({ type: 'buy', index })}
              onReroll={() => act({ type: 'reroll' })}
              onHaggle={() => act({ type: 'haggle' })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {screen.kind === 'forge' && (
            <ForgeDialog
              options={screen.options}
              cost={screen.cost}
              current={hero.edge}
              weaponName={hero.weapon?.item.name ?? 'your weapon'}
              notice={screen.notice}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {screen.kind === 'craft' && (
            <CraftDialog
              title={screen.title}
              options={screen.options}
              items={hero.items}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {screen.kind === 'pick' && (
            <PickDialog
              title={screen.title}
              text={screen.text}
              options={screen.options}
              notice={screen.notice}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {screen.kind === 'oil' && (
            <OilDialog
              options={screen.options}
              weaponName={hero.weapon?.item.name ?? 'your weapon'}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
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
          {finished && <EndScreen victory={screen.kind === 'victory'} week={week} gold={hero.gold} seed={state.seed} onRestart={onExit} />}
        </>
      )}
    </Stage>
  )
}
