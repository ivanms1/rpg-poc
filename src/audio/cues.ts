/** Which sound (if any) goes with a battle event or a change in the run. Pure, so it's testable. */
import type { BattleEvent } from '../core/combat/types'
import type { RunState } from '../core/run/types'
import { timeOf } from '../core/run/difficulty'
import type { SoundName } from './sounds'

export const battleCue = (event: BattleEvent): SoundName | null => {
  switch (event.type) {
    case 'strike':
      return 'strike'
    case 'damage':
      return event.hpLost > 0 ? 'hit' : event.armorLost > 0 ? 'armor' : null
    case 'heal':
      return 'heal'
    case 'status':
      return event.delta > 0 ? 'status' : null
    case 'stunned':
      return 'status'
    case 'gold':
      return event.delta > 0 ? 'coin' : null
    case 'exposed':
    case 'wounded':
      return 'armor'
    case 'death':
      return 'death'
    case 'battleEnd':
      return event.winner === 'player' ? 'victory' : 'defeat'
    default:
      return null
  }
}

const itemCount = (s: RunState): number => s.hero.items.filter(Boolean).length + (s.hero.weapon ? 1 : 0)

const DIALOGS: ReadonlySet<RunState['screen']['kind']> = new Set(['choice', 'message', 'shop', 'forge', 'oil', 'craft', 'pick'])

/**
 * Sounds for one reducer step on the map: footsteps, dialogs, loot, spending, nightfall and the
 * start of a battle. Battles play their own cues; a footstep is dropped when anything else sounds.
 */
export const runCues = (prev: RunState, next: RunState): readonly SoundName[] => {
  if (prev === next) return []
  const cues: SoundName[] = []
  // A boss that transforms goes straight from one battle to the next.
  if (next.screen.kind === 'battle' && (prev.screen.kind !== 'battle' || prev.screen.battle.id !== next.screen.battle.id)) {
    cues.push(next.screen.battle.boss ? 'boss' : 'encounter')
  }
  if (DIALOGS.has(next.screen.kind) && !DIALOGS.has(prev.screen.kind)) cues.push('open')
  if (itemCount(next) > itemCount(prev) || (next.hero.weapon?.item.id !== prev.hero.weapon?.item.id && next.hero.weapon)) cues.push('pickup')
  if (next.hero.gold < prev.hero.gold) cues.push('spend')
  else if (next.hero.gold > prev.hero.gold && prev.screen.kind !== 'battle') cues.push('coin')
  if (timeOf(next).phase === 'night' && timeOf(prev).phase === 'day') cues.push('night')
  if (cues.length === 0 && next.step > prev.step) cues.push('step')
  return [...new Set(cues)]
}
