import type { ItemDef } from '../../core/items/types'
import { PixelIcon } from '../PixelIcon'
import { itemIcon } from './itemIcon'
import { ITEM_SHAPES } from './shapes'

/** The item's pixel icon, tinted by material. */
export function ItemGlyph({ item, scale = 2 }: { readonly item: ItemDef; readonly scale?: number }) {
  const { shape, color } = itemIcon(item)
  return <PixelIcon bitmap={ITEM_SHAPES[shape]} color={color} scale={scale} />
}
