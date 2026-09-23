import type { FighterVisible, Side } from '../../core/combat/types'
import { CREATURE_SPRITES } from '../../render/creatures'
import { PALETTE } from '../../render/palette'
import { PixelIcon } from '../PixelIcon'
import { StatRow } from '../StatPanel'
import type { ActivePopup, Tone } from './playback'

const TONE_COLOR: Record<Tone, string> = {
  health: PALETTE.health,
  attack: PALETTE.attack,
  armor: PALETTE.armor,
  speed: PALETTE.speed,
  gold: PALETTE.gold,
  stun: PALETTE.stun,
  poison: PALETTE.poison,
  acid: PALETTE.acid,
  regen: PALETTE.regen,
  riptide: PALETTE.riptide,
  freeze: PALETTE.freeze,
  thorns: PALETTE.thorns,
  purity: PALETTE.purity,
}

export const POPUP_MS = 900

interface Props {
  readonly side: Side
  readonly name: string
  /** Enemy or boss id whose art to show (falls back to a monogram). */
  readonly spriteId?: string
  readonly stats: FighterVisible
  readonly popups: readonly ActivePopup[]
  /** Changes whenever this fighter strikes / gets hit, restarting the CSS animation. */
  readonly actionKey: string
  readonly action: 'lunge' | 'hit' | null
  readonly dead: boolean
  readonly big?: boolean
}

/** Art pixels per bitmap pixel in battle, matching the hero. */
const SPRITE_SCALE = 4

function Sprite({ side, name, spriteId, big }: Pick<Props, 'side' | 'name' | 'spriteId' | 'big'>) {
  if (side === 'player') return <PixelIcon icon="knight" color="#aab0b8" scale={SPRITE_SCALE} />
  const sprite = spriteId ? CREATURE_SPRITES[spriteId] : undefined
  if (sprite) return <PixelIcon bitmap={sprite.bitmap} color={sprite.color} scale={SPRITE_SCALE} />
  return (
    <span className={`monogram${big ? ' monogram-big' : ''}`} aria-hidden="true">
      {name.charAt(0)}
    </span>
  )
}

export function Fighter({ side, name, spriteId, stats, popups, actionKey, action, dead, big }: Props) {
  return (
    <div className={`fighter fighter-${side}${dead ? ' is-dead' : ''}`} data-testid={`fighter-${side}`}>
      <div className="fighter-figure">
        <div className="fighter-popups" aria-live="polite">
          {popups.map(({ key, popup, age }) => (
            <span
              key={key}
              className="popup"
              style={{ color: TONE_COLOR[popup.tone], animationDuration: `${POPUP_MS}ms`, animationDelay: `-${Math.round(age)}ms` }}
            >
              {'icon' in popup ? (
                <>
                  <PixelIcon icon={popup.icon} color={TONE_COLOR[popup.tone]} />
                  {popup.value > 0 ? `+${popup.value}` : popup.value}
                </>
              ) : (
                popup.label
              )}
            </span>
          ))}
        </div>
        <div key={actionKey} className={`fighter-sprite${action ? ` do-${action}` : ''}`}>
          <Sprite side={side} name={name} spriteId={spriteId} big={big} />
        </div>
      </div>
      <div className="fighter-stats">
        <StatRow icon="heart" color={PALETTE.health} value={`${Math.max(0, stats.hp)}/${stats.maxHp}`} label={`${name} health`} />
        <StatRow icon="sword" color={PALETTE.attack} value={stats.attack} label={`${name} attack`} />
        <StatRow icon="shield" color={PALETTE.armor} value={stats.armor} label={`${name} armor`} />
        <StatRow icon="boots" color={PALETTE.speed} value={stats.speed} label={`${name} speed`} />
      </div>
    </div>
  )
}
