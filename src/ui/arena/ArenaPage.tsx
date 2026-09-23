import { useMemo, useState } from 'react'
import { simulateBattle } from '../../core/combat/simulate'
import type { BattleResult, Combatant } from '../../core/combat/types'
import { buildPlayer, creatureCombatant, describeItem } from '../../core/items/loadout'
import { BOSSES_BY_ID } from '../../data/bosses'
import { ENEMIES_BY_ID, enemyAt } from '../../data/enemies'
import { ITEMS_BY_ID } from '../../data/items'
import { WEAPONS_BY_ID } from '../../data/weapons'
import { BattleLog } from './BattleLog'
import { LoadoutForm, type LoadoutChoice } from './LoadoutForm'
import { OpponentForm, type OpponentChoice } from './OpponentForm'
import './arena.css'

const INITIAL_LOADOUT: LoadoutChoice = {
  weaponId: 'sword-of-the-hero',
  slots: [
    { id: 'leather-vest', tier: 'normal' },
    { id: 'horned-helmet', tier: 'normal' },
    ...Array.from({ length: 6 }, () => ({ id: '', tier: 'normal' as const })),
  ],
  slotCount: 4,
  hp: 0,
  baseHealth: 10,
  gold: 0,
}

const toPlayer = (c: LoadoutChoice): Combatant => {
  const weapon = WEAPONS_BY_ID[c.weaponId]
  const items = c.slots.slice(0, c.slotCount).map((slot) => {
    const item = ITEMS_BY_ID[slot.id]
    return item ? { item, tier: slot.tier } : null
  })
  return buildPlayer({
    weapon: weapon ? { item: weapon } : null,
    items,
    baseHealth: c.baseHealth,
    hp: c.hp > 0 ? c.hp : undefined,
    gold: c.gold,
  })
}

const toOpponent = (o: OpponentChoice): { combatant: Combatant; text: string } => {
  const def = o.kind === 'boss' ? BOSSES_BY_ID[o.id] : ENEMIES_BY_ID[o.id] && enemyAt(ENEMIES_BY_ID[o.id]!, o.level)
  if (!def) throw new Error(`Unknown opponent: ${o.id}`)
  return { combatant: creatureCombatant(def), text: def.text }
}

type Outcome = { readonly ok: true; readonly result: BattleResult; readonly enemyName: string; readonly enemyText: string } | { readonly ok: false; readonly error: string }

const run = (loadout: LoadoutChoice, opponent: OpponentChoice): Outcome => {
  try {
    const { combatant, text } = toOpponent(opponent)
    return { ok: true, result: simulateBattle(toPlayer(loadout), combatant), enemyName: combatant.name, enemyText: text }
  } catch (err) {
    console.error('Arena simulation failed', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Simulation failed' }
  }
}

/** Debug arena (?arena): build a loadout, pick an opponent, read the fight. Re-simulates on every change. */
export function ArenaPage() {
  const [loadout, setLoadout] = useState(INITIAL_LOADOUT)
  const [opponent, setOpponent] = useState<OpponentChoice>({ kind: 'enemy', id: 'wolf', level: 1 })
  const outcome = useMemo(() => run(loadout, opponent), [loadout, opponent])
  const player = useMemo(() => toPlayer(loadout), [loadout])
  const equipped = [WEAPONS_BY_ID[loadout.weaponId], ...loadout.slots.slice(0, loadout.slotCount).map((s) => ITEMS_BY_ID[s.id])]

  return (
    <div className="arena">
      <header>
        <h1>Combat Arena</h1>
        <a href="./">← back to game</a>
      </header>
      <div className="arena-grid">
        <div>
          <LoadoutForm value={loadout} onChange={setLoadout} />
          <section className="arena-box">
            <p className="arena-stats" data-testid="arena-hero-stats">
              Max HP {player.stats.maxHp} · Attack {player.stats.attack} · Armor {player.stats.armor} · Speed {player.stats.speed}
            </p>
            <ul className="arena-effects">
              {equipped.map((item, i) => item?.text && <li key={i}><b>{item.name}:</b> {describeItem(item)}</li>)}
            </ul>
          </section>
          <OpponentForm value={opponent} onChange={setOpponent} />
          {outcome.ok && outcome.enemyText && <p className="arena-effects">{outcome.enemyText}</p>}
        </div>
        {outcome.ok ? (
          <BattleLog result={outcome.result} names={{ player: 'Hero', enemy: outcome.enemyName }} />
        ) : (
          <p className="arena-error" role="alert">{outcome.error}</p>
        )}
      </div>
    </div>
  )
}
