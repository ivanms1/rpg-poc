import { STATUS_NAMES, type Statuses } from '../../core/combat/types'
import { PALETTE } from '../../render/palette'
import { PixelIcon } from '../PixelIcon'

/** Active status stacks as icon + count, in canonical status order. */
export function StatusList({ statuses, label }: { readonly statuses: Statuses; readonly label: string }) {
  const active = STATUS_NAMES.filter((name) => statuses[name] > 0)
  return (
    <ul className="status-list" aria-label={label}>
      {active.map((name) => (
        <li key={name} style={{ color: PALETTE[name] }} aria-label={`${name} ${statuses[name]}`}>
          <PixelIcon icon={name} color={PALETTE[name]} />
          <span>{statuses[name]}</span>
        </li>
      ))}
    </ul>
  )
}
