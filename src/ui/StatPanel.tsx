import { PALETTE } from '../render/palette'
import type { IconName } from './icons'
import { PixelIcon } from './PixelIcon'

export interface StatValues {
  readonly health: number
  readonly maxHealth: number
  readonly attack: number
  readonly armor: number
  readonly speed: number
  readonly gold: number
}

interface StatRowProps {
  readonly icon: IconName
  readonly color: string
  readonly value: string | number
  readonly label: string
}

export function StatRow({ icon, color, value, label }: StatRowProps) {
  return (
    <div className="stat" style={{ color }} aria-label={`${label} ${value}`}>
      <span className="stat-icon frame-thin" style={{ borderColor: color }}>
        <PixelIcon icon={icon} color={color} />
      </span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export function StatPanel({ stats }: { readonly stats: StatValues }) {
  return (
    <section className="panel stats-panel" aria-label="Stats">
      <div className="stats-grid">
        <StatRow icon="heart" color={PALETTE.health} value={`${stats.health}/${stats.maxHealth}`} label="Health" />
        <StatRow icon="coin" color={PALETTE.gold} value={stats.gold} label="Gold" />
        <StatRow icon="sword" color={PALETTE.attack} value={stats.attack} label="Attack" />
        <StatRow icon="shield" color={PALETTE.armor} value={stats.armor} label="Armor" />
        <StatRow icon="boots" color={PALETTE.speed} value={stats.speed} label="Speed" />
      </div>
    </section>
  )
}
