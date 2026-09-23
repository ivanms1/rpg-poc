import { useState } from 'react'
import { isDifficulty, type Difficulty } from '../core/run/difficulty'
import { createRun } from '../core/run/reducer'
import type { RunState } from '../core/run/types'
import { CONTENT } from '../data/content'
import { Game } from './Game'
import { clearSave, readSave } from './save/storage'
import { Stage } from './Stage'
import { TitleScreen } from './TitleScreen'

const randomSeed = (): number => Math.floor(Math.random() * 1_000_000_000) + 1

/** `?seed=123` starts that run straight away (handy for sharing and tests). */
const seedFromUrl = (): number | null => {
  const seed = Number(new URLSearchParams(window.location.search).get('seed'))
  return Number.isInteger(seed) && seed > 0 ? seed : null
}

const DIFFICULTY_KEY = 'hic.difficulty'

/** `?difficulty=hard` picks the mode for a `?seed=` run. */
const difficultyFromUrl = (): Difficulty | null => {
  const value = new URLSearchParams(window.location.search).get('difficulty')
  return isDifficulty(value) ? value : null
}

const loadDifficulty = (): Difficulty => {
  try {
    const stored = window.localStorage.getItem(DIFFICULTY_KEY)
    return isDifficulty(stored) ? stored : 'normal'
  } catch {
    return 'normal'
  }
}

const saveDifficulty = (difficulty: Difficulty) => {
  try {
    window.localStorage.setItem(DIFFICULTY_KEY, difficulty)
  } catch {
    // Storage unavailable (private mode): the choice just isn't remembered.
  }
}

type Mode = { readonly kind: 'title' } | { readonly kind: 'run'; readonly run: RunState; readonly key: number }

export function Root() {
  const [mode, setMode] = useState<Mode>(() => {
    const seed = seedFromUrl()
    return seed ? { kind: 'run', run: createRun(seed, CONTENT, { difficulty: difficultyFromUrl() ?? 'normal' }), key: 0 } : { kind: 'title' }
  })
  const [difficulty, setDifficulty] = useState(loadDifficulty)
  const [save, setSave] = useState(() => readSave(CONTENT))

  const start = (run: RunState) => setMode((m) => ({ kind: 'run', run, key: m.kind === 'run' ? m.key + 1 : 1 }))

  if (mode.kind === 'run') {
    return (
      <Game
        key={mode.key}
        initial={mode.run}
        onExit={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setSave(readSave(CONTENT))
          setMode({ kind: 'title' })
        }}
      />
    )
  }

  return (
    <Stage>
      {() => (
        <TitleScreen
          saved={save?.ok ? save.state : null}
          saveError={save && !save.ok ? save.error : null}
          difficulty={difficulty}
          onDifficulty={(next) => {
            setDifficulty(next)
            saveDifficulty(next)
          }}
          onContinue={() => save?.ok && start(save.state)}
          onNewRun={() => {
            clearSave()
            start(createRun(randomSeed(), CONTENT, { difficulty }))
          }}
        />
      )}
    </Stage>
  )
}
