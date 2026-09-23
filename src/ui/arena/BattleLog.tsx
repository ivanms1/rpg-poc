import type { BattleResult, FighterVisible, Side } from '../../core/combat/types'
import { formatEvent } from './formatEvent'

const STATUS_SHORT: Record<string, string> = {
  poison: 'psn', acid: 'acd', regen: 'rgn', riptide: 'rip', freeze: 'frz', stun: 'stn', thorns: 'thr', purity: 'pur',
}

const summary = (f: FighterVisible): string => {
  const statuses = Object.entries(f.statuses)
    .filter(([, n]) => n > 0)
    .map(([name, n]) => `${STATUS_SHORT[name] ?? name}${n}`)
    .join(' ')
  return `hp ${f.hp}/${f.maxHp} arm ${f.armor} atk ${f.attack} spd ${f.speed} ${statuses}`.trim()
}

export function BattleLog({ result, names }: { readonly result: BattleResult; readonly names: Readonly<Record<Side, string>> }) {
  const rows = result.events.flatMap((e, i) => {
    const text = formatEvent(e, names)
    return text ? [{ i, text, e }] : []
  })
  const { player, enemy } = result.final

  return (
    <section className="arena-box arena-log" aria-label="Battle log">
      <h2 className={result.winner === 'player' ? 'win' : 'loss'} data-testid="arena-result">
        {result.winner === 'player' ? 'Victory' : 'Defeat'} — {result.rounds} rounds · Hero {Math.max(0, player.hp)}/{player.maxHp} ·{' '}
        {names.enemy} {Math.max(0, enemy.hp)}/{enemy.maxHp}
      </h2>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>{names.player}</th>
            <th>{names.enemy}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ i, text, e }) => (
            <tr key={i} className={`ev-${e.type}${'side' in e ? ` side-${e.side}` : ''}`}>
              <td>{text}</td>
              <td>{summary(e.snapshot.player)}</td>
              <td>{summary(e.snapshot.enemy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
