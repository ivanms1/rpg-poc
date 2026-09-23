/** Colours sampled from He is Coming screenshots (docs/research/screenshots). Mirrored as CSS vars in ui/theme.css. */
export const PALETTE = {
  bg: '#22111a',
  frame: '#e5ddc8',
  muted: '#657e85',
  health: '#9bd040',
  attack: '#e84545',
  armor: '#6dbce5',
  speed: '#fbe666',
  gold: '#e28816',
  enemy: '#eb3a44',
  shop: '#d77617',
  shrine: '#9aa4b8',
  night: '#7a5cf0',

  pine: '#3f8a3a',
  forestPine: '#2e6e36',
  flowers: '#d890b8',
  grass: '#4f7a36',
  swampGrass: '#94a420',
  rock: '#6a7c64',
  deadTree: '#985b3f',
  path: '#8b5a3c',
  water: '#5b8fd0',
  wood: '#a86a3c',
  bone: '#e5ddc8',
  pumpkin: '#e27a16',

  poison: '#7fc03a',
  acid: '#c8d840',
  regen: '#9bd040',
  riptide: '#3f7fd8',
  freeze: '#9fe0ff',
  stun: '#fbe666',
  thorns: '#c08050',
  purity: '#f4f0ff',
} as const

export type PaletteColor = keyof typeof PALETTE
