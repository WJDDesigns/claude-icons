// Twelve warm-leaning hues tuned to sit next to Claude's neutral interface.
// `ink` is the stroke color; the tile behind the icon is a light tint of it.
export const PALETTE = [
  { id: 'clay', label: 'Clay', light: '#c2603f', dark: '#e48b6c' },
  { id: 'amber', label: 'Amber', light: '#b07a16', dark: '#e0aa47' },
  { id: 'olive', label: 'Olive', light: '#6f7c2b', dark: '#aab866' },
  { id: 'green', label: 'Green', light: '#3c8452', dark: '#74c08a' },
  { id: 'teal', label: 'Teal', light: '#23807d', dark: '#5fbfba' },
  { id: 'sky', label: 'Sky', light: '#2f7bae', dark: '#6cb0e0' },
  { id: 'blue', label: 'Blue', light: '#4462c4', dark: '#8aa2ef' },
  { id: 'indigo', label: 'Indigo', light: '#5d55b9', dark: '#a29cee' },
  { id: 'violet', label: 'Violet', light: '#8a4fb0', dark: '#c495e3' },
  { id: 'plum', label: 'Plum', light: '#a5487e', dark: '#e08cbb' },
  { id: 'rose', label: 'Rose', light: '#bf4a59', dark: '#ec8794' },
  { id: 'stone', label: 'Stone', light: '#6d675c', dark: '#b3ac9f' },
];

export const PALETTE_MAP = Object.fromEntries(PALETTE.map((c) => [c.id, c]));

// The color a category reaches for first, so a sidebar groups by meaning.
export const CATEGORY_COLOR = {
  work: 'blue',
  commerce: 'violet',
  money: 'green',
  web: 'sky',
  ai: 'clay',
  writing: 'stone',
  creative: 'plum',
  school: 'indigo',
  home: 'olive',
  health: 'rose',
  travel: 'teal',
  food: 'amber',
  play: 'amber',
  legal: 'stone',
  symbols: 'clay',
};
