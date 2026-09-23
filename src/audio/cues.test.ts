import { CONTENT } from '../data/content'
import { ITEMS_BY_ID } from '../data/items'
import { WEAPONS } from '../data/weapons'
import type { BattleEvent, FighterVisible } from '../core/combat/types'
import { createRun } from '../core/run/reducer'
import type { BattleInfo, RunState } from '../core/run/types'
import { EMPTY_STATUSES } from '../core/combat/state'
import { battleCue, runCues } from './cues'
import { SOUNDS } from './sounds'

const fighter: FighterVisible = { hp: 10, maxHp: 10, attack: 1, armor: 0, speed: 0, gold: 0, statuses: EMPTY_STATUSES }
const ev = (body: Record<string, unknown>): BattleEvent => ({ ...body, snapshot: { player: fighter, enemy: fighter } }) as unknown as BattleEvent

describe('battleCue', () => {
  it.each([
    [{ type: 'strike', side: 'player', damage: 1 }, 'strike'],
    [{ type: 'damage', side: 'enemy', amount: 3, armorLost: 1, hpLost: 2, source: 'strike' }, 'hit'],
    [{ type: 'damage', side: 'enemy', amount: 3, armorLost: 3, hpLost: 0, source: 'strike' }, 'armor'],
    [{ type: 'damage', side: 'enemy', amount: 0, armorLost: 0, hpLost: 0, source: 'strike' }, null],
    [{ type: 'heal', side: 'player', amount: 2, source: 'x' }, 'heal'],
    [{ type: 'status', side: 'player', status: 'poison', delta: 2, source: 'x' }, 'status'],
    [{ type: 'status', side: 'player', status: 'poison', delta: -1, source: 'x' }, null],
    [{ type: 'stunned', side: 'enemy' }, 'status'],
    [{ type: 'gold', side: 'player', delta: 1, source: 'x' }, 'coin'],
    [{ type: 'gold', side: 'player', delta: -1, source: 'x' }, null],
    [{ type: 'exposed', side: 'enemy' }, 'armor'],
    [{ type: 'wounded', side: 'enemy' }, 'armor'],
    [{ type: 'death', side: 'enemy' }, 'death'],
    [{ type: 'battleEnd', winner: 'player', turns: 3 }, 'victory'],
    [{ type: 'battleEnd', winner: 'enemy', turns: 3 }, 'defeat'],
    [{ type: 'turnStart', side: 'player', turn: 1 }, null],
  ])('%o → %s', (body, cue) => {
    expect(battleCue(ev(body))).toBe(cue)
  })

  it('only names sounds that exist', () => {
    for (const name of Object.keys(SOUNDS)) expect(SOUNDS[name as keyof typeof SOUNDS].length).toBeGreaterThan(0)
  })
})

describe('runCues', () => {
  const base = createRun(1, CONTENT)
  const battle = (boss: boolean, id = 'b1'): RunState['screen'] => ({ kind: 'battle', battle: { id, boss } as BattleInfo })

  it('plays nothing when nothing changed', () => {
    expect(runCues(base, base)).toEqual([])
  })

  it('footsteps on a plain move', () => {
    expect(runCues(base, { ...base, step: 1 })).toEqual(['step'])
  })

  it('an encounter or a boss when a battle starts, without footsteps', () => {
    expect(runCues(base, { ...base, step: 1, screen: battle(false) })).toEqual(['encounter'])
    expect(runCues(base, { ...base, screen: battle(true) })).toEqual(['boss'])
  })

  it('a transforming boss sounds again; the same battle does not', () => {
    const first = { ...base, screen: battle(true, 'leshen') }
    expect(runCues(first, { ...base, screen: battle(true, 'abomination') })).toEqual(['boss'])
    expect(runCues(first, { ...first, hero: { ...base.hero } })).toEqual([])
  })

  it('opens dialogs once', () => {
    const chest: RunState['screen'] = { kind: 'message', title: 't', text: 'x' }
    expect(runCues(base, { ...base, step: 1, screen: chest })).toEqual(['open'])
    expect(runCues({ ...base, screen: chest }, { ...base, screen: { kind: 'shop' } as RunState['screen'] })).toEqual([])
  })

  it('loot, spending and income', () => {
    const vest = { item: ITEMS_BY_ID['leather-vest']! }
    const withVest = { ...base, hero: { ...base.hero, items: [vest, null, null, null] } }
    expect(runCues(base, withVest)).toEqual(['pickup'])
    const rich = { ...base, hero: { ...base.hero, gold: 5 } }
    expect(runCues(rich, { ...withVest, hero: { ...withVest.hero, gold: 2 } })).toEqual(['pickup', 'spend'])
    expect(runCues(base, rich)).toEqual(['coin'])
    expect(runCues({ ...base, screen: battle(false) }, rich)).toEqual([])
  })

  it('a new weapon counts as loot', () => {
    const sword = { item: WEAPONS.find((w) => w.id !== base.hero.weapon?.item.id)! }
    expect(runCues(base, { ...base, hero: { ...base.hero, weapon: sword } })).toContain('pickup')
  })

  it('tolls when night falls', () => {
    expect(runCues({ ...base, step: 49 }, { ...base, step: 50 })).toEqual(['night'])
  })
})
