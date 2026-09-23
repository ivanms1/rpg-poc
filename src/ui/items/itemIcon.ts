/** Picks an icon shape from an item's name and a tint from its material (Iron → grey, Blood → red…). */
import type { ItemDef } from '../../core/items/types'
import { PALETTE } from '../../render/palette'
import { RARITY_COLOR } from '../rarity'
import type { ItemShape } from './shapes'

export const MATERIAL = {
  hero: PALETTE.frame,
  iron: '#a0a8b4',
  wood: '#b07a48',
  blood: '#d84848',
  frost: '#8fd0f0',
  swift: '#f0c848',
  emerald: '#6cc050',
  thorn: '#b89a58',
  leather: '#c89a60',
  royal: '#f0b030',
  fire: '#e27a16',
} as const

type Rule<T> = readonly [pattern: RegExp, value: T]

const WEAPON_SHAPES: readonly Rule<ItemShape>[] = [
  [/dagger|drinker/i, 'dagger'],
  [/sickle|scythe/i, 'scythe'],
  [/axe|cleaver/i, 'axe'],
  [/spear|lance/i, 'spear'],
  [/\bbow\b/i, 'bow'],
  [/club|hammer|boom/i, 'club'],
  [/staff|rod|stick|scepter|wand/i, 'staff'],
  [/./, 'sword'],
]

/** Order matters: "Chainmail Armor" is armor, not a chain; "Earring" before "ring"; "Stone Steak" is meat. */
const ITEM_SHAPE_RULES: readonly Rule<ItemShape>[] = [
  [/horned/i, 'horned'],
  [/helmet|\bcap\b/i, 'helmet'],
  [/armor|breastplate|vest/i, 'armor'],
  [/shield|buckler/i, 'shield'],
  [/boots|greaves|sandals/i, 'boots'],
  [/gauntlet|glove/i, 'gauntlet'],
  [/belt/i, 'belt'],
  [/cloak/i, 'cloak'],
  [/earring/i, 'earring'],
  [/ring|bracelet/i, 'ring'],
  [/crown/i, 'crown'],
  [/necklace|medallion|talisman|bond|chain/i, 'necklace'],
  [/gemstone|\bgem\b/i, 'gem'],
  [/chestnut|acorn|\bnut/i, 'nut'],
  [/roast|steak|meat/i, 'meat'],
  [/wine|potion|elixir|flask/i, 'bottle'],
  [/bomb|shrapnel|surprise|keg|powder|firecracker/i, 'bomb'],
  [/trap/i, 'trap'],
  [/feather|wings/i, 'feather'],
  [/rose/i, 'rose'],
  [/tooth|fang/i, 'tooth'],
  [/\bice\b|frost|cold|thorns/i, 'crystal'],
  [/transfusion/i, 'bottle'],
  [/scales/i, 'armor'],
  [/burst|explosion/i, 'bomb'],
  [/change|coin/i, 'coins'],
  [/heart/i, 'gem'],
  [/stone|\bore\b/i, 'stone'],
]

const MATERIAL_RULES: readonly Rule<string>[] = [
  [/hero/i, MATERIAL.hero],
  [/iron|granite|stone|mountain|chainmail|studded|fortified|cracked|blastcap|plated|battle|twin|blacksmith/i, MATERIAL.iron],
  [/wood|oak|brittlebark|quickgrowth|pinecone|acorn|chestnut/i, MATERIAL.wood],
  [/blood|crimson|vampir|ruby|heart|lifesteal|sanguine/i, MATERIAL.blood],
  [/frost|\bice|frozen|icicle|sapphire|moonlight/i, MATERIAL.frost],
  [/swift|feather|saffron|citrine|\bgold\b|tempest/i, MATERIAL.swift],
  [/emerald/i, MATERIAL.emerald],
  [/blackbriar|bramble|thorn|razor|spiny|horned|bearclaw/i, MATERIAL.thorn],
  [/leather|assault/i, MATERIAL.leather],
  [/royal/i, MATERIAL.royal],
  [/explosive|bomb|boom|firecracker|kindling/i, MATERIAL.fire],
]

const first = <T>(rules: readonly Rule<T>[], name: string): T | undefined => rules.find(([re]) => re.test(name))?.[1]

export interface ItemIcon {
  readonly shape: ItemShape
  readonly color: string
}

export const itemIcon = (item: ItemDef): ItemIcon => ({
  shape: first(item.kind === 'weapon' ? WEAPON_SHAPES : ITEM_SHAPE_RULES, item.name) ?? 'pouch',
  color: first(MATERIAL_RULES, item.name) ?? RARITY_COLOR[item.rarity],
})
