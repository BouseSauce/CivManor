// Centralized icon and color mappings for resources and generic icons
export const RESOURCE_ICON_MAP = {
  Timber: { icon: 'fa-tree', color: '#7fb56d' },
  Stone: { icon: 'fa-cubes', color: '#9ea7b1' },
  Food: { icon: 'fa-bowl-food', color: '#e6c27a' },
  Meat: { icon: 'fa-drumstick-bite', color: '#c76b56' },
  Berries: { icon: 'fa-berry', color: '#b05a8b' },
  Planks: { icon: 'fa-layer-group', color: '#8b6b4a' },
  Bread: { icon: 'fa-bread-slice', color: '#e0b96a' },
  Fish: { icon: 'fa-fish', color: '#4bb0c6' },
  Ore: { icon: 'fa-gem', color: '#77797b' },
  IronOre: { icon: 'fa-gem', color: '#77797b' },
  // Legacy ore resource removed; use Stone / IronIngot icons
  Coal: { icon: 'fa-fire', color: '#ff8a34' },
  IronIngot: { icon: 'fa-cubes-stacked', color: '#a68b6f' },
  Ingots: { icon: 'fa-cubes-stacked', color: '#a68b6f' },
  Steel: { icon: 'fa-shield-halved', color: '#6ea0c1' },
  Knowledge: { icon: 'fa-book', color: '#67b0ff' },
  Trebuchet: { icon: 'fa-chess-rook', color: '#d1c6a9' },
  Horses: { icon: 'fa-horse', color: '#b77a50' },
  Captives: { icon: 'fa-user-lock', color: '#8a6f6f' },
  Villager: { icon: 'fa-user', color: '#ffffff' }
};

export const UNIT_ICON_MAP = {
  Villager: { icon: 'fa-person-digging', color: '#ffffff' },
  Militia: { icon: 'fa-person-rifle', color: '#e0cda0' },
  Spearmen: { icon: 'fa-khanda', color: '#adb6bf' },
  Knights: { icon: 'fa-horse-head', color: '#ffd700' },
  Trebuchet: { icon: 'fa-chess-rook', color: '#8d6e63' },
  Scout: { icon: 'fa-binoculars', color: '#7fb56d' },
  ManAtArms: { icon: 'fa-shield-halved', color: '#9ea7b1' },
  ImperialGuard: { icon: 'fa-crown', color: '#ffd700' },
  Archer: { icon: 'fa-bow-arrow', color: '#7fb56d' },
  Mangonel: { icon: 'fa-fire-burner', color: '#c76b56' },
  Spy: { icon: 'fa-user-secret', color: '#67b0ff' },
  Scholar: { icon: 'fa-book-open-reader', color: '#67b0ff' },
  CargoWagon: { icon: 'fa-cart-flatbed', color: '#c5a059' },
  LargeCargoWagon: { icon: 'fa-truck-ramp-box', color: '#8b6b4a' },
  ClaimCart: { icon: 'fa-flag', color: '#ffd700' }
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
  if (name.includes('mountain') || name.includes('cubes') || name.includes('mine') || name.includes('gem')) return '#adb6bf';
  if (name.includes('shield') || name.includes('bars') || name.includes('forge')) return '#6ea0c1';
  if (name.includes('book') || name.includes('scroll') || name.includes('user-secret')) return '#67b0ff';
  return '#c5a059';
}

export default {
  RESOURCE_ICON_MAP,
  getIconForResource,
  getColorForIconClass
};
