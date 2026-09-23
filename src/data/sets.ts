/** Woodland sets whose parts exist so far (wiki: Woodland_itemsets). */
import { counterKey, getCounter, setCounter } from '../core/combat/state'
import { everyOtherTurn, gain, gainStatus, missingHealth, myBase, payloadAmount, restore, seq, when } from '../core/effects/dsl'
import type { Hook } from '../core/combat/types'
import type { SetDef } from '../core/items/types'
import { byId } from './define'

const BLOODMOON = 'bloodmoon-strike'

/** Wounded: remember the next own turn; on that turn, strikes heal what they deal. */
const bloodmoonWounded: Hook = (s, ctx) => setCounter(s, counterKey(ctx.self, BLOODMOON, 'turn'), s.fighters[ctx.self].turns + 1)
const bloodmoonHit: Hook = when((s, self) => s.fighters[self].turns === getCounter(s, counterKey(self, BLOODMOON, 'turn'), -1), restore(payloadAmount))

export const SETS: readonly SetDef[] = [
  {
    id: 'heros-return',
    name: "Hero's Return",
    parts: ['sword-of-the-hero', 'boots-of-the-hero', 'shield-of-the-hero'],
    text: 'Gain 2 attack, armor and speed',
    stats: { attack: 2, armor: 2, speed: 2 },
  },
  {
    id: 'raw-hide',
    name: 'Raw Hide',
    parts: ['leather-boots', 'leather-glove', 'leather-vest'],
    text: 'Gain 1 attack every other turn',
    effect: () => ({ hooks: { turnStart: when(everyOtherTurn, gain('attack', 1)) } }),
  },
  {
    id: 'redwood-crown',
    name: 'Redwood Crown',
    parts: ['redwood-rod', 'redwood-cloak', 'redwood-helmet'],
    text: 'Wounded: Restore health to full',
    effect: () => ({ hooks: { wounded: restore(missingHealth) } }),
  },
  {
    id: 'saffron-talon',
    name: 'Saffron Talon',
    parts: ['featherweight-blade', 'saffron-feather'],
    text: 'On Hit: Gain 1 speed',
    effect: () => ({ hooks: { onHit: gain('speed', 1) } }),
  },
  {
    id: 'elderwood-mask',
    name: 'Elderwood Mask',
    parts: ['elderwood-staff', 'elderwood-necklace'],
    text: 'Battle Start: Double your base attack, armor and speed',
    effect: () => ({ hooks: { battleStart: seq(gain('attack', myBase('attack')), gain('armor', myBase('armor')), gain('speed', myBase('speed'))) } }),
  },
  {
    id: BLOODMOON,
    name: 'Bloodmoon Strike',
    parts: ['bloodmoon-dagger', 'swiftstrike-gauntlet'],
    text: 'Wounded: Restore health equal to damage dealt by strikes on your next turn',
    effect: () => ({ hooks: { wounded: bloodmoonWounded, onHit: bloodmoonHit } }),
  },
  {
    id: 'briar-greaves',
    name: 'Briar Greaves',
    parts: ['assault-greaves', 'jagged-edge'],
    text: 'Whenever you take damage gain 1 thorn',
    effect: () => ({ hooks: { onDamaged: gainStatus('thorns', 1) } }),
  },
]

export const SETS_BY_ID = byId(SETS)
