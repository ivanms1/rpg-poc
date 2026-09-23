import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { setProgress, type Equipped } from '../core/items/loadout'
import { heroCombatant } from '../core/run/hero'
import { planRoute } from '../core/run/route'
import { isSaveable } from '../core/run/save'
import type { RunAction, RunState } from '../core/run/types'
import { withering } from '../core/world/clock'
import { DIFFICULTIES, empowerBoss, timeOf } from '../core/run/difficulty'
import type { Point } from '../core/world/types'
import { CONTENT } from '../data/content'
import { createAtlas, loadImage, type Atlas } from '../render/atlas'
import { PALETTE } from '../render/palette'
import { TILESET_URL } from '../render/tiles'
import { CombatView } from './combat/CombatView'
import { useSound } from './audio/useSound'
import { Inventory } from './Inventory'
import { WorldCanvas } from './map/WorldCanvas'
import { PixelIcon } from './PixelIcon'
import { BossPreview, ChoiceDialog, EndScreen, MessageDialog } from './run/Dialogs'
import { gameCues, gameReducer, initGame } from './run/gameState'
import { CraftDialog, ForgeDialog, OilDialog, PickDialog, ShopDialog } from './run/ShopDialogs'
import { clearSave, writeSave } from './save/storage'
import { StatPanel } from './StatPanel'
import { Stage } from './Stage'
import { Timeline } from './Timeline'

/** Map canvas in art pixels: .map-area (384×224) minus its 1px border. */
const MAP_W = 382
const MAP_H = 222
const MAX_SLOTS = 8
const WALK_STEP_MS = 70

const MOVES: Record<string, readonly [number, number]> = {
  w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
  arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
}

const reducer = gameReducer(CONTENT)
/** Keys that never skip the reveal animation. */
const MODIFIERS: ReadonlySet<string> = new Set(['shift', 'control', 'alt', 'meta', 'm'])

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
  /** The zoomed-out map: while Shift is held, or pinned open with the Shf button. */
  const [mapHeld, setMapHeld] = useState(false)
  const [mapPinned, setMapPinned] = useState(false)
  const overview = mapHeld || mapPinned
  const [route, setRoute] = useState<readonly Point[]>([])
  const [game, dispatch] = useReducer(reducer, initial, initGame)
  const state = game.run
  /** Lookout / Crystal Ball reveal playing: the run is paused and its dialog waits. */
  const revealing = game.reveal !== null
  const sound = useSound()
  const previous = useRef(game)
  const { hero, screen, week, step } = state
  /** The screen as drawn: a dialog opened by a reveal shows once the animation ends. */
  const shown: RunState['screen'] = revealing ? { kind: 'map' } : screen
  const mode = DIFFICULTIES[state.difficulty]
  const time = timeOf(state)
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
  const bossDef = CONTENT.bosses.find((b) => b.id === state.bosses[week - 1])
  const boss = bossDef && empowerBoss(bossDef, state.difficulty)

  const act = useCallback((action: RunAction) => dispatch(action), [])
  const skipReveal = useCallback(() => dispatch({ type: 'revealDone' }), [])
  const finished = screen.kind === 'gameOver' || screen.kind === 'victory'

  /** Click-to-move: one step per tick. A dialog, battle, key press or blocked step ends the walk. */
  useEffect(() => {
    const next = route[0]
    if (!next) return
    const dx = next.x - state.player.x
    const dy = next.y - state.player.y
    const blocked = screen.kind !== 'map' || revealing || showBoss || overview || Math.abs(dx) + Math.abs(dy) !== 1
    const timer = window.setTimeout(
      () => {
        if (blocked) return setRoute([])
        act({ type: 'move', dx, dy })
        setRoute((r) => r.slice(1))
      },
      blocked ? 0 : WALK_STEP_MS,
    )
    return () => window.clearTimeout(timer)
  }, [route, screen.kind, revealing, showBoss, overview, state.player, act])

  const walkTo = useCallback(
    (tile: Point) => {
      if (!showBoss && !overview) setRoute(planRoute(state, tile))
    },
    [showBoss, overview, state],
  )

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => e.key === 'Shift' && setMapHeld(true)
    const onUp = (e: KeyboardEvent) => e.key === 'Shift' && setMapHeld(false)
    const onBlur = () => setMapHeld(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    for (const cue of gameCues(previous.current, game)) sound.play(cue)
    previous.current = game
  }, [game, sound])

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
      if (key === 'm') return sound.toggleMute()
      if (revealing) {
        if (MODIFIERS.has(key)) return
        e.preventDefault()
        return skipReveal()
      }
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
        setMapPinned(false)
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
      if (!move || showBoss || overview) return
      e.preventDefault()
      setRoute([])
      act({ type: 'move', dx: move[0], dy: move[1] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, skipReveal, revealing, finished, onExit, screen.kind, showBoss, overview, sound])

  return (
    <Stage>
      {(scale) => (
        <>
          <aside className="sidebar">
            <StatPanel stats={{ ...stats, health: hero.hp, maxHealth: stats.maxHp, gold: hero.gold }} />
            {/* Re-keyed per screen so a pinned tooltip never outlives the screen it was opened on. */}
            <Inventory
              key={screen.kind}
              weapon={hero.weapon}
              items={hero.items}
              total={MAX_SLOTS}
              onDiscard={screen.kind === 'battle' || revealing ? undefined : (slot) => act({ type: 'discard', slot })}
              onReorder={screen.kind === 'battle' || revealing ? undefined : (from, to) => act({ type: 'reorder', from, to })}
              describe={describe}
            />
          </aside>
          <header className="panel topbar">
            <span className="week-label">Week {week}</span>
            <button
              type="button"
              className={`key-hint key-button${overview ? ' is-on' : ''}`}
              title="Hold Shift for the map"
              aria-label="Toggle map overview"
              aria-pressed={mapPinned}
              onClick={() => (revealing ? skipReveal() : setMapPinned((o) => !o))}
            >
              Shf
            </button>
            <Timeline step={step} schedule={mode.schedule} />
            <button type="button" className="boss-preview" title="Boss (Tab)" aria-label="Boss preview" onClick={() => (revealing ? skipReveal() : setShowBoss((o) => !o))}>
              <PixelIcon icon="skull" color={PALETTE.enemy} scale={2} />
            </button>
            <span className="key-hint key-hint-red">Tab</span>
          </header>
          <main className={`panel map-area${time.phase === 'night' ? ' is-night' : ''}`}>
            <WorldCanvas
              atlas={atlas}
              world={state.world}
              player={state.player}
              revealed={state.revealed}
              decay={withering(week, step, mode.schedule)}
              width={MAP_W}
              height={MAP_H}
              stageScale={scale}
              overview={overview && !revealing}
              reveal={game.reveal}
              onRevealDone={skipReveal}
              onTileClick={walkTo}
            />
            {revealing && <div className="map-overview-label">The fog lifts · any key to skip</div>}
            {overview && !revealing && <div className="map-overview-label">{mapPinned ? 'Map · Shf or Esc to return' : 'Map · release Shift to return'}</div>}
            <div className="map-caption">
              {time.phase} {time.day} · {time.stepsLeftInSegment} steps left · {mode.name} · seed {state.seed}
            </div>
            <button
              type="button"
              className="map-sound"
              title="Sound (M)"
              aria-label={sound.muted ? 'Unmute sound' : 'Mute sound'}
              aria-pressed={!sound.muted}
              onClick={sound.toggleMute}
            >
              <PixelIcon icon={sound.muted ? 'soundOff' : 'soundOn'} color="currentColor" />
            </button>
            {loadError && <div className="error">{loadError}</div>}
          </main>

          {screen.kind === 'battle' && (
            <CombatView key={screen.battle.id} battle={screen.battle} onCue={sound.play} onFinish={() => act({ type: 'finishBattle' })} />
          )}
          {shown.kind === 'choice' && (
            <ChoiceDialog
              title={shown.title}
              options={shown.options}
              notice={shown.notice}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {shown.kind === 'message' && <MessageDialog title={shown.title} text={shown.text} onClose={() => act({ type: 'dismiss' })} />}
          {shown.kind === 'shop' && (
            <ShopDialog
              title={shown.title}
              stock={shown.stock}
              gold={hero.gold}
              rerollCost={shown.rerollCost}
              canHaggle={shown.canHaggle}
              notice={shown.notice}
              onBuy={(index) => act({ type: 'buy', index })}
              onReroll={() => act({ type: 'reroll' })}
              onHaggle={() => act({ type: 'haggle' })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {shown.kind === 'forge' && (
            <ForgeDialog
              options={shown.options}
              cost={shown.cost}
              current={hero.edge}
              weaponName={hero.weapon?.item.name ?? 'your weapon'}
              notice={shown.notice}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {shown.kind === 'craft' && (
            <CraftDialog
              title={shown.title}
              options={shown.options}
              items={hero.items}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {shown.kind === 'pick' && (
            <PickDialog
              title={shown.title}
              text={shown.text}
              options={shown.options}
              notice={shown.notice}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {shown.kind === 'oil' && (
            <OilDialog
              options={shown.options}
              weaponName={hero.weapon?.item.name ?? 'your weapon'}
              onChoose={(index) => act({ type: 'choose', index })}
              onClose={() => act({ type: 'dismiss' })}
            />
          )}
          {showBoss && shown.kind === 'map' && !revealing && boss && (
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
