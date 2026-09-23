import type { BattleEvent, Side, TriggerName } from '../../core/combat/types'

const TRIGGER_LABEL: Record<TriggerName, string> = {
  battleStart: 'Battle Start',
  turnStart: 'Turn Start',
  turnEnd: 'Turn End',
  onHit: 'On Hit',
  exposed: 'Exposed',
  wounded: 'Wounded',
  onDamaged: 'took damage',
  onHeal: 'restored health',
  onGainThorns: 'gained thorns',
  enemyWounded: 'enemy Wounded',
}

const change = (delta: number): string => (delta >= 0 ? `gains ${delta}` : `loses ${-delta}`)

/** One readable log line per event, or null for events not worth a line. */
export const formatEvent = (e: BattleEvent, names: Readonly<Record<Side, string>>): string | null => {
  switch (e.type) {
    case 'battleStart':
      return 'Battle starts'
    case 'turnStart':
      return `— Round ${e.turn}: ${names[e.side]} —`
    case 'trigger':
      return `${e.source} (${TRIGGER_LABEL[e.trigger]})`
    case 'strike':
      return `${names[e.side]} strikes for ${e.damage}`
    case 'stunned':
      return `${names[e.side]} is stunned and skips a strike`
    case 'damage': {
      const armor = e.armorLost > 0 ? ` (${e.armorLost} armor)` : ''
      return `${names[e.side]} takes ${e.amount}${armor} — ${e.source}`
    }
    case 'heal':
      return `${names[e.side]} restores ${e.amount} — ${e.source}`
    case 'stat':
      return `${names[e.side]} ${change(e.delta)} ${e.stat === 'maxHp' ? 'max health' : e.stat} — ${e.source}`
    case 'status':
      return `${names[e.side]} ${change(e.delta)} ${e.status} — ${e.source}`
    case 'gold':
      return `${names[e.side]} ${change(e.delta)} gold — ${e.source}`
    case 'exposed':
      return `${names[e.side]} is Exposed`
    case 'wounded':
      return `${names[e.side]} is Wounded`
    case 'death':
      return `${names[e.side]} dies`
    case 'battleEnd':
      return `${names[e.winner]} wins after ${e.turns} round${e.turns === 1 ? '' : 's'}`
  }
}
