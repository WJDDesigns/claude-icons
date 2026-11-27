// Builds the open SVG pack from icons/icons.js:
//   svg/<name>.svg     one file per icon (24 x 24, currentColor, 1.5 stroke)
//   dist/icons.json    names, categories, tags and markup, for tools and plugins
//   dist/sprite.svg    every icon as a <symbol id="cpi-<name>">
// Run: node scripts/build.mjs
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { ICONS, CATEGORIES, toSvg } from '../icons/icons.js';
import { PALETTE } from '../src/palette.js';

const root = new URL('..', import.meta.url).pathname;
rmSync(`${root}svg`, { recursive: true, force: true });
mkdirSync(`${root}svg`, { recursive: true });
mkdirSync(`${root}dist`, { recursive: true });

for (const icon of ICONS) writeFileSync(`${root}svg/${icon.name}.svg`, toSvg(icon) + '\n');

writeFileSync(
  `${root}dist/icons.json`,
  JSON.stringify(
    {
      grid: { viewBox: '0 0 24 24', strokeWidth: 1.5, linecap: 'round', linejoin: 'round' },
      categories: CATEGORIES,
      palette: PALETTE,
      icons: ICONS.map(({ name, label, category, tags, body }) => ({ name, label, category, tags, body })),
    },
    null,
    1
  ) + '\n'
);

const symbols = ICONS.map((i) => `  <symbol id="cpi-${i.name}" viewBox="0 0 24 24">${i.body}</symbol>`).join('\n');
writeFileSync(
  `${root}dist/sprite.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n${symbols}\n</svg>\n`
);

console.log(`Built ${readdirSync(`${root}svg`).length} SVGs, icons.json and sprite.svg`);
