// Suggests an icon and a color from what a project is about.
//
// It reads three signals, weighted by how much they say about the project:
//   the project name (strongest), its description or instructions, and the
//   names of files added to it (extensions count too: .csv, .fig, .py ...).
// Everything runs locally and instantly, so it can re-rank on every keystroke.

import { ICONS, ICON_MAP } from '../icons/icons.js';
import { PALETTE, CATEGORY_COLOR } from './palette.js';

const SOURCE_WEIGHT = { name: 3, description: 1.4, file: 1 };

// File types say a lot about a project even when its name doesn't.
const EXTENSIONS = {
  pdf: ['document'], doc: ['document'], docx: ['document'], txt: ['document'], rtf: ['document'],
  md: ['notebook', 'document'], pages: ['document'],
  csv: ['table', 'scatter'], xlsx: ['table', 'budget'], xls: ['table'], numbers: ['table'], tsv: ['table'],
  ipynb: ['scatter', 'code'], parquet: ['database'], sql: ['database'], db: ['database'], sqlite: ['database'],
  py: ['code', 'terminal'], js: ['code'], ts: ['code'], tsx: ['code', 'layout'], jsx: ['code', 'layout'],
  go: ['code'], rs: ['code'], java: ['code'], rb: ['code'], php: ['code', 'browser'], swift: ['smartphone', 'code'],
  kt: ['smartphone', 'code'], sh: ['terminal'], yml: ['gear'], yaml: ['gear'], json: ['code'], toml: ['gear'],
  html: ['browser'], css: ['layout'], scss: ['layout'],
  fig: ['pen-tool', 'layout'], sketch: ['pen-tool'], ai: ['pen-tool'], svg: ['pen-tool', 'shapes'], psd: ['image'],
  png: ['image'], jpg: ['image', 'camera'], jpeg: ['image', 'camera'], heic: ['camera'], raw: ['camera'], gif: ['image'],
  mp4: ['video'], mov: ['film'], mkv: ['film'], mp3: ['music'], wav: ['headphones'], m4a: ['microphone'],
  ppt: ['presentation'], pptx: ['presentation'], key: ['presentation'],
  epub: ['book-open'], stl: ['cube'], obj: ['cube'], blend: ['cube'], gpx: ['map'], kml: ['map-pin'],
  ics: ['calendar'], eml: ['mail'], qbo: ['budget'], ofx: ['bank'],
};

// A few words that need a nudge toward the obvious icon.
const ALIASES = {
  redesign: ['browser'], site: ['browser', 'globe'], website: ['browser', 'globe'], landing: ['browser'],
  roaster: ['coffee'], roastery: ['coffee'], espresso: ['coffee'], cafe: ['coffee'],
  remodel: ['hammer', 'paint-roller'], renovation: ['hammer'], kitchen: ['cooking-pot', 'house'],
  marathon: ['activity'], run: ['activity'], running: ['activity'], '5k': ['activity'], '10k': ['activity'],
  spanish: ['translate'], french: ['translate'], japanese: ['translate'], german: ['translate'], italian: ['translate'],
  q1: ['chart-bar'], q2: ['chart-bar'], q3: ['chart-bar'], q4: ['chart-bar'], board: ['presentation'],
  deck: ['presentation'], pitch: ['presentation'], investors: ['presentation', 'trending-up'],
  fair: ['flask'], homework: ['backpack'], thesis: ['graduation-cap', 'document'], dissertation: ['graduation-cap'],
  bot: ['robot'], agent: ['robot'], chatbot: ['robot'], prompt: ['sparkles'], prompts: ['sparkles'], claude: ['sparkles'],
  wedding: ['ring'], honeymoon: ['plane', 'ring'], etsy: ['store', 'yarn'], knit: ['yarn'], hats: ['yarn'],
  w2: ['taxes'], '1099': ['taxes'], irs: ['taxes'], refund: ['taxes', 'receipt'],
  newsletter: ['newspaper', 'mail'], substack: ['newspaper'], podcast: ['microphone'], youtube: ['video'],
  vacation: ['plane', 'suitcase'], trip: ['plane', 'map'], holiday: ['plane'], japan: ['plane'], europe: ['plane'],
  dnd: ['dice'], campaign: ['megaphone'], recipe: ['chef-hat'], recipes: ['chef-hat'], baking: ['cake'],
  puppy: ['paw'], dog: ['paw'], cat: ['paw'], vet: ['paw'], garden: ['plant'], novel: ['book-open', 'feather'],
  resume: ['user', 'document'], cv: ['user', 'document'], job: ['briefcase'], interview: ['chats', 'briefcase'],
};

const STOP = new Set(
  'a an and the of for to in on with my our your new project projects stuff misc notes v1 v2 final draft copy about from by at is it this that be or as into'.split(' ')
);

export function tokenize(text) {
  return String(text || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function stem(t) {
  if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 4 && t.endsWith('es') && /(sh|ch|x|ss)es$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  if (t.length > 4 && t.endsWith('ed')) return t.slice(0, -2);
  return t;
}

// tag/stem -> [{ icon, weight }]
const INDEX = new Map();
function add(key, icon, weight) {
  if (!INDEX.has(key)) INDEX.set(key, []);
  const list = INDEX.get(key);
  const hit = list.find((h) => h.icon === icon);
  if (hit) hit.weight = Math.max(hit.weight, weight);
  else list.push({ icon, weight });
}
for (const icon of ICONS) {
  icon.name.split('-').forEach((part) => {
    add(part, icon.name, 4);
    add(stem(part), icon.name, 3.5);
  });
  icon.tags.forEach((tag, i) => {
    const w = i === 0 ? 3.5 : 3;
    add(tag, icon.name, w);
    add(stem(tag), icon.name, w * 0.85);
  });
}
const KEYS = [...INDEX.keys()];

function lookup(token) {
  const exact = INDEX.get(token) || [];
  const stemmed = token !== stem(token) ? INDEX.get(stem(token)) || [] : [];
  const out = [...exact, ...stemmed.map((h) => ({ ...h, weight: h.weight * 0.9 }))];
  // Prefix matches catch "invoic" -> invoice, "photograph" -> photography.
  if (out.length === 0 && token.length >= 5) {
    for (const k of KEYS) {
      if (k.length >= 5 && (k.startsWith(token) || token.startsWith(k))) {
        INDEX.get(k).forEach((h) => out.push({ ...h, weight: h.weight * 0.45 }));
      }
    }
  }
  for (const target of ALIASES[token] || []) out.push({ icon: target, weight: 4 });
  return out;
}

/**
 * @param {{name?: string, description?: string, files?: string[]}} project
 * @returns {{icon: string, score: number, reasons: string[]}[]}
 */
export function rankIcons(project, limit = 6) {
  const scores = new Map();
  const reasons = new Map();
  const bump = (icon, amount, reason) => {
    if (!ICON_MAP[icon]) return;
    scores.set(icon, (scores.get(icon) || 0) + amount);
    if (!reasons.has(icon)) reasons.set(icon, new Map());
    const r = reasons.get(icon);
    r.set(reason, (r.get(reason) || 0) + amount);
  };

  const sources = [
    ['name', project.name],
    ['description', project.description],
  ];
  for (const [source, text] of sources) {
    const seen = new Set();
    for (const token of tokenize(text)) {
      if (seen.has(token)) continue;
      seen.add(token);
      for (const hit of lookup(token)) bump(hit.icon, hit.weight * SOURCE_WEIGHT[source], `“${token}” in ${source}`);
    }
    if (/\b[a-z0-9-]+\.(com|io|co|org|net|dev|app|shop|store)\b/i.test(text || '')) {
      bump('browser', 6 * SOURCE_WEIGHT[source], `a web address in ${source}`);
      bump('globe', 4 * SOURCE_WEIGHT[source], `a web address in ${source}`);
    }
  }

  const extCount = new Map();
  for (const file of project.files || []) {
    const match = /\.([a-z0-9]+)$/i.exec(file);
    const base = match ? file.slice(0, -match[0].length) : file;
    if (match) {
      const ext = match[1].toLowerCase();
      extCount.set(ext, (extCount.get(ext) || 0) + 1);
    }
    const seen = new Set();
    for (const token of tokenize(base)) {
      if (seen.has(token)) continue;
      seen.add(token);
      for (const hit of lookup(token)) bump(hit.icon, hit.weight * SOURCE_WEIGHT.file, `file “${file}”`);
    }
  }
  for (const [ext, count] of extCount) {
    (EXTENSIONS[ext] || []).forEach((icon, i) =>
      bump(icon, (i === 0 ? 3 : 1.5) * Math.min(1 + Math.log2(count), 3), `${count} .${ext} file${count > 1 ? 's' : ''}`)
    );
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([icon, score]) => ({
      icon,
      score: Math.round(score * 10) / 10,
      reasons: [...reasons.get(icon).entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r).slice(0, 3),
    }));
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Pick the color: the icon's category color, unless a sibling project already
 * uses the same icon in that color, in which case step to the next free hue.
 */
export function pickColor(iconName, taken = []) {
  const icon = ICON_MAP[iconName];
  const base = CATEGORY_COLOR[icon?.category] || 'clay';
  const start = PALETTE.findIndex((c) => c.id === base);
  for (let step = 0; step < PALETTE.length; step++) {
    const color = PALETTE[(start + step * 5) % PALETTE.length].id;
    if (!taken.some((t) => t.icon === iconName && t.color === color)) return color;
  }
  return base;
}

/**
 * The full suggestion: best icon, its color, how sure we are, and alternatives.
 * @param {{name?: string, description?: string, files?: string[]}} project
 * @param {{icon: string, color: string}[]} taken  icons other projects already use
 */
export function suggest(project, taken = []) {
  const ranked = rankIcons(project, 8);
  if (ranked.length === 0) {
    // Nothing to go on yet: a calm, stable default seeded by the name.
    const fallbacks = ['folder', 'sparkles', 'circle', 'hexagon', 'star'];
    const icon = fallbacks[hash(project.name || '') % fallbacks.length];
    return { icon, color: pickColor(icon, taken), confidence: 0, reasons: [], alternatives: [] };
  }
  const [best, second] = ranked;
  const margin = second ? (best.score - second.score) / best.score : 1;
  const confidence = Math.max(0.05, Math.min(1, (best.score / 14) * (0.55 + margin * 0.45)));
  return {
    icon: best.icon,
    color: pickColor(best.icon, taken),
    confidence: Math.round(confidence * 100) / 100,
    reasons: best.reasons,
    alternatives: ranked.slice(1).map((r) => ({ ...r, color: pickColor(r.icon, taken) })),
  };
}
