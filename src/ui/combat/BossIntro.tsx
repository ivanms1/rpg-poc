interface Props {
  readonly title: string
  readonly subtitle: string
  readonly text: string
  readonly onBegin: () => void
}

/** Title card before a boss fight: red flash, three stomps, the boss's name and trait. */
export function BossIntro({ title, subtitle, text, onBegin }: Props) {
  return (
    <div className="boss-intro" role="dialog" aria-label="Boss arrives" onClick={onBegin}>
      <div className="boss-intro-flash" aria-hidden="true" />
      <div className="boss-intro-monogram" aria-hidden="true">
        {title.charAt(0)}
      </div>
      <p className="boss-intro-sub">{subtitle}</p>
      <h2 className="boss-intro-title">{title}</h2>
      <p className="boss-intro-text">{text}</p>
      <button type="button" className="boss-intro-fight" onClick={onBegin} autoFocus>
        Fight (Space)
      </button>
    </div>
  )
}
