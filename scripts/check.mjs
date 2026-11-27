// Checks every icon follows the grid rules, so the set stays consistent as it grows.
import { ICONS, CATEGORIES } from '../icons/icons.js';

const errors = [];
const names = new Set();
const cats = new Set(CATEGORIES.map((c) => c.id));
for (const i of ICONS) {
  if (names.has(i.name)) errors.push(`${i.name}: duplicate name`);
  names.add(i.name);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.name)) errors.push(`${i.name}: names are kebab-case`);
  if (!cats.has(i.category)) errors.push(`${i.name}: unknown category ${i.category}`);
  if (i.tags.length < 4) errors.push(`${i.name}: needs at least 4 tags for suggestions`);
  if (/fill="(?!none|currentColor)/.test(i.body)) errors.push(`${i.name}: only currentColor fills are allowed`);
  if (/stroke-width/.test(i.body)) errors.push(`${i.name}: stroke width comes from the root svg`);
  // Rough bounds check on absolute coordinates: everything stays on the 24 grid.
  for (const m of i.body.matchAll(/\b(?:cx|cy|x|y)="(-?[\d.]+)"/g)) {
    const v = Number(m[1]);
    if (v < 0.5 || v > 23.5) errors.push(`${i.name}: coordinate ${v} is off the grid`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`${ICONS.length} icons in ${CATEGORIES.length} categories pass the grid checks`);
