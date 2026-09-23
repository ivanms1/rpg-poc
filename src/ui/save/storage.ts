/** localStorage wrapper for the current run. Storage can be unavailable (private mode, blocked): never throw. */
import { deserializeRun, serializeRun, type LoadResult } from '../../core/run/save'
import type { Content, RunState } from '../../core/run/types'

const KEY = 'hic.run'

/** The saved run, `null` when there is none. */
export const readSave = (content: Content): LoadResult | null => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw === null) return null
    return deserializeRun(JSON.parse(raw), content)
  } catch (err) {
    console.warn('Could not read the saved run', err)
    return { ok: false, error: 'the saved run is unreadable' }
  }
}

export const writeSave = (state: RunState): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(serializeRun(state)))
  } catch (err) {
    console.warn('Could not save the run', err)
  }
}

export const clearSave = (): void => {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
