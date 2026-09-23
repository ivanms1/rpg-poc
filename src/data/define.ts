import type { ItemDef, ItemStats, Rarity, Scale, SourceSpec, Tag } from '../core/items/types'

export const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

interface Spec {
  readonly rarity: Rarity
  readonly stats?: ItemStats
  readonly text?: string
  readonly tags?: readonly Tag[]
  readonly effect?: (x: Scale) => SourceSpec
}

const define =
  (kind: ItemDef['kind']) =>
  (name: string, spec: Spec): ItemDef => ({
    id: slug(name),
    name,
    kind,
    rarity: spec.rarity,
    tags: spec.tags ?? [],
    stats: spec.stats ?? {},
    text: spec.text ?? '',
    ...(spec.effect ? { effect: spec.effect } : {}),
  })

export const weapon = define('weapon')
export const item = define('item')

export const byId = <T extends { readonly id: string }>(defs: readonly T[]): Readonly<Record<string, T>> => {
  const map: Record<string, T> = {}
  for (const def of defs) {
    if (map[def.id]) throw new Error(`Duplicate content id: ${def.id}`)
    map[def.id] = def
  }
  return map
}
