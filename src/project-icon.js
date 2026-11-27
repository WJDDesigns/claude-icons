// <project-icon> renders a project icon on its tinted tile, with an optional status.
//
//   <project-icon icon="store" color="violet" status="working" progress="0.4" size="32">
//
// status: idle (default) | working | needs-input | done | error
//   working      a light travels around the tile; with `progress` (0 to 1) it fills instead
//   needs-input  a clay dot at the top right that breathes, the loudest state on purpose
//   done         a green check that pops in once, meant to clear when the project is opened
//   error        a red mark, steady, no motion
// Motion is dropped when the person prefers reduced motion; every state still reads by shape.

import { ICON_MAP } from '../icons/icons.js';
import { PALETTE_MAP } from './palette.js';

const LABELS = {
  working: 'working',
  'needs-input': 'needs your input',
  done: 'done',
  error: 'hit a problem',
};

const STYLE = `
:host { display: inline-block; position: relative; width: var(--s); height: var(--s); flex: none; vertical-align: middle; }
.tile { position: absolute; inset: 0; border-radius: 28%; display: grid; place-items: center;
  background: color-mix(in srgb, var(--ink) 15%, transparent); color: var(--ink);
  transition: background .3s ease, color .3s ease; }
.tile svg { width: 62%; height: 62%; display: block; }
.ring { position: absolute; inset: calc(var(--s) * -0.1); width: calc(100% + var(--s) * 0.2); height: calc(100% + var(--s) * 0.2);
  overflow: visible; pointer-events: none; opacity: 0; transition: opacity .25s ease; }
.ring rect { fill: none; stroke: var(--ink); stroke-width: 2; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.ring .track { opacity: .18; }
:host([status="working"]) .ring { opacity: 1; }
:host([status="working"]:not([progress])) .ring .run { stroke-dasharray: 18 82; animation: run 1.6s linear infinite; }
:host([status="working"][progress]) .ring .run { stroke-dasharray: var(--p) 100; transition: stroke-dasharray .5s ease; }
@keyframes run { to { stroke-dashoffset: -100; } }

.badge { position: absolute; border-radius: 50%; display: grid; place-items: center; box-sizing: border-box;
  border: max(1.5px, calc(var(--s) * 0.06)) solid var(--surface, #faf9f5); transform: scale(0); transition: transform .25s cubic-bezier(.3,1.6,.5,1); }
.badge svg { width: 70%; height: 70%; display: block; }
.attn { top: -14%; right: -14%; width: 44%; height: 44%; background: var(--attention, #d97757); }
.attn::after { content: ''; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--attention, #d97757);
  opacity: 0; }
:host([status="needs-input"]) .attn { transform: scale(1); }
:host([status="needs-input"]) .attn::after { animation: breathe 2.4s ease-out .3s infinite; }
@keyframes breathe { 0% { transform: scale(1); opacity: .7; } 70%, 100% { transform: scale(2); opacity: 0; } }

.ok, .err { bottom: -14%; right: -14%; width: 50%; height: 50%; color: #fff; }
.ok { background: var(--success, #3c8452); }
.err { background: var(--danger, #c0453b); }
:host([status="done"]) .ok { transform: scale(1); }
:host([status="error"]) .err { transform: scale(1); }
:host([status="error"]) .tile { filter: saturate(.4); }

@media (prefers-reduced-motion: reduce) {
  :host([status="working"]:not([progress])) .ring .run { animation: none; stroke-dasharray: 3 5; }
  .attn::after { animation: none !important; }
  .badge, .ring { transition: none; }
}
`;

export class ProjectIcon extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'color', 'status', 'progress', 'size', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <svg class="ring" viewBox="-1 -1 102 102" preserveAspectRatio="none" aria-hidden="true">
        <rect class="track" x="0" y="0" width="100" height="100" rx="30" pathLength="100"/>
        <rect class="run" x="0" y="0" width="100" height="100" rx="30" pathLength="100"/>
      </svg>
      <div class="tile"></div>
      <span class="badge attn" aria-hidden="true"></span>
      <span class="badge ok" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.5l4 4 8-9"/></svg></span>
      <span class="badge err" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M12 6.5v6.5M12 17.5v.01"/></svg></span>`;
    this.tile = this.shadowRoot.querySelector('.tile');
    this.setAttribute('role', 'img');
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const icon = ICON_MAP[this.getAttribute('icon')] || ICON_MAP.folder;
    const color = PALETTE_MAP[this.getAttribute('color')] || PALETTE_MAP.clay;
    const size = Number(this.getAttribute('size')) || 32;
    const dark = this.closest('[data-theme="dark"]') ||
      (!this.closest('[data-theme="light"]') && matchMedia('(prefers-color-scheme: dark)').matches);
    this.style.setProperty('--s', `${size}px`);
    this.style.setProperty('--ink', dark ? color.dark : color.light);
    const progress = this.getAttribute('progress');
    if (progress !== null) this.style.setProperty('--p', Math.max(0, Math.min(1, Number(progress))) * 100);
    const stroke = size <= 24 ? 2 : size >= 56 ? 1.5 : 1.75;
    if (this.tile.dataset.icon !== icon.name || this.tile.dataset.stroke !== String(stroke)) {
      this.tile.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${icon.body}</svg>`;
      this.tile.dataset.icon = icon.name;
      this.tile.dataset.stroke = String(stroke);
    }
    const status = LABELS[this.getAttribute('status')];
    const name = this.getAttribute('label') || icon.label;
    this.setAttribute('aria-label', status ? `${name}, ${status}` : name);
  }
}

if (!customElements.get('project-icon')) customElements.define('project-icon', ProjectIcon);
