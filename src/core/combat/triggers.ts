import { emit, isOver } from './state'
import type { BattleState, HookPayload, Side, TriggerName } from './types'

/**
 * Runs `trigger` on every source of `side`, in trigger order. A `trigger` event is logged only
 * when the hook actually changed something, placed before the effects it caused.
 */
export const runTrigger = (state: BattleState, side: Side, trigger: TriggerName, payload: HookPayload = {}): BattleState => {
  if (isOver(state) || state.depth >= state.rules.maxTriggerDepth) return state
  if (!state.sources[side].some((src) => src.hooks?.[trigger])) return state
  let current: BattleState = { ...state, depth: state.depth + 1 }

  for (const source of state.sources[side]) {
    const hook = source.hooks?.[trigger]
    if (!hook) continue
    if (isOver(current)) break
    const before = current
    const after = hook(before, { self: side, source: { id: source.id, name: source.name }, payload })
    if (after.events.length > before.events.length) {
      const marker = emit(before, { type: 'trigger', side, trigger, source: source.name }).events.at(-1)
      current = marker
        ? { ...after, events: [...before.events, marker, ...after.events.slice(before.events.length)] }
        : after
    } else {
      current = after
    }
  }

  return { ...current, depth: state.depth }
}
