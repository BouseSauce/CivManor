// Centralized icon and color mappings for resources and generic icons
export const RESOURCE_ICON_MAP = {
  Timber: { icon: 'fa-tree', color: '#7fb56d' },
  Stone: { icon: 'fa-cubes', color: '#9ea7b1' },
  Meat: { icon: 'fa-drumstick-bite', color: '#c76b56' },
  Berries: { icon: 'fa-bowl-food', color: '#b05a8b' },
  Gold: { icon: 'fa-coins', color: '#e6c27a' },
  Planks: { icon: 'fa-layer-group', color: '#8b6b4a' },
  Bread: { icon: 'fa-bread-slice', color: '#e0b96a' },
  Fish: { icon: 'fa-fish', color: '#4bb0c6' },
  IronOre: { icon: 'fa-mountain', color: '#77797b' },
  Coal: { icon: 'fa-fire', color: '#ff8a34' },
  Ingots: { icon: 'fa-bars', color: '#a68b6f' },
  Steel: { icon: 'fa-shield-halved', color: '#6ea0c1' },
  Knowledge: { icon: 'fa-book', color: '#67b0ff' },
  Leather: { icon: 'fa-scroll', color: '#c48a4f' },
  Hides: { icon: 'fa-paw', color: '#8b6b4a' },
  SimpleSpear: { icon: 'fa-khanda', color: '#8a8a8a' },
  Trebuchet: { icon: 'fa-chess-rook', color: '#d1c6a9' }
};

export function getIconForResource(key) {
  return RESOURCE_ICON_MAP[key] || { icon: 'fa-box', color: '#bfbfbf' };
}

export function getColorForIconClass(iconClass) {
  if (!iconClass) return 'var(--accent-gold)';
  const name = iconClass.toLowerCase();
  if (name.includes('tree') || name.includes('wheat') || name.includes('seed')) return '#4fa34f';
  if (name.includes('coins') || name.includes('bread') || name.includes('bowl')) return '#e6c27a';
  if (name.includes('fish')) return '#33a8c9';
  if (name.includes('fire') || name.includes('drumstick')) return '#ff7a2a';
  if (name.includes('mountain') || name.includes('cubes') || name.includes('mine') ) return '#adb6bf';
  if (name.includes('shield') || name.includes('bars') || name.includes('forge')) return '#6ea0c1';
  if (name.includes('book') || name.includes('scroll')) return '#67b0ff';
  return '#c5a059';
}

export default {
  RESOURCE_ICON_MAP,
  getIconForResource,
  getColorForIconClass
};
