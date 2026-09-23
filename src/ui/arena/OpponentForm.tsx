import { BOSSES } from '../../data/bosses'
import { ENEMIES } from '../../data/enemies'

export type OpponentChoice =
  | { readonly kind: 'enemy'; readonly id: string; readonly level: 1 | 2 | 3 }
  | { readonly kind: 'boss'; readonly id: string }

const encode = (o: OpponentChoice): string => (o.kind === 'enemy' ? `enemy:${o.id}` : `boss:${o.id}`)

export function OpponentForm({ value, onChange }: { readonly value: OpponentChoice; readonly onChange: (next: OpponentChoice) => void }) {
  const select = (raw: string) => {
    const [kind, id = ''] = raw.split(':')
    onChange(kind === 'boss' ? { kind: 'boss', id } : { kind: 'enemy', id, level: value.kind === 'enemy' ? value.level : 1 })
  }

  return (
    <fieldset className="arena-box">
      <legend>Opponent</legend>
      <label className="arena-field">
        Creature
        <select value={encode(value)} onChange={(e) => select(e.target.value)}>
          <optgroup label="Enemies">
            {ENEMIES.map((e) => (
              <option key={e.id} value={`enemy:${e.id}`}>
                {e.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Bosses">
            {BOSSES.map((b) => (
              <option key={b.id} value={`boss:${b.id}`}>
                {b.name} (week {b.week})
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      {value.kind === 'enemy' && (
        <label className="arena-field">
          Level (week)
          <select value={value.level} onChange={(e) => onChange({ ...value, level: Number(e.target.value) as 1 | 2 | 3 })}>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </label>
      )}
    </fieldset>
  )
}
