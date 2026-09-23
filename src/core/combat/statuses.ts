/** Status ticks. Rules: docs/research/mechanics.md §5. */
import { dealDamage, heal, loseArmor, removeStatus } from './ops'
import { updateFighter } from './state'
import type { BattleState, Side } from './types'

/** Turn start: poison (only while unarmored, always decays), then acid (strips armor, no decay). */
export const turnStartTicks = (state: BattleState, side: Side): BattleState => {
  let s = state
  const poison = s.fighters[side].statuses.poison
  if (poison > 0) {
    if (s.fighters[side].armor === 0) s = dealDamage(s, side, poison, 'poison', { kind: 'status' })
    s = removeStatus(s, side, 'poison', 1, 'poison')
  }
  const acid = s.fighters[side].statuses.acid
  if (acid > 0) s = loseArmor(s, side, acid, 'acid')
  return s
}

/** Turn end: regeneration, riptide, freeze thaw, then spent thorns are removed on both sides. */
export const turnEndTicks = (state: BattleState, side: Side): BattleState => {
  let s = state
  const regen = s.fighters[side].statuses.regen
  if (regen > 0) {
    s = heal(s, side, regen, 'regeneration')
    s = removeStatus(s, side, 'regen', 1, 'regeneration')
  }
  if (s.fighters[side].statuses.riptide > 0) {
    s = dealDamage(s, side, s.rules.riptideDamage, 'riptide', { kind: 'status' })
    s = removeStatus(s, side, 'riptide', 1, 'riptide')
  }
  s = removeStatus(s, side, 'freeze', 1, 'thaw')
  for (const who of ['player', 'enemy'] as const) {
    if (!s.fighters[who].thornsFired) continue
    s = removeStatus(s, who, 'thorns', s.fighters[who].statuses.thorns, 'thorns spent')
    s = updateFighter(s, who, { thornsFired: false })
  }
  return s
}
