import { ICONS, ICON_MAP, CATEGORIES, toSvg } from '../icons/icons.js';
import { PALETTE, PALETTE_MAP } from './palette.js';
import { suggest } from './suggest.js';
import './project-icon.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
};
// Only touch the DOM when the markup really changed, so focus and animations survive ticks.
function setHTML(el, html) { if (el.__html !== html) { el.innerHTML = html; el.__html = html; } }
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ── Theme ──────────────────────────────────────────────────────────── */
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
function refreshIcons() {
  document.querySelectorAll('project-icon').forEach((el) => el.render());
  if (currentView === 'library') renderLibrary();
}
$('#themeToggle').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('cpi-theme', next); } catch {}
  refreshIcons();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshIcons);
const inkOf = (color) => (isDark() ? PALETTE_MAP[color].dark : PALETTE_MAP[color].light);

/* ── Demo state ─────────────────────────────────────────────────────── */
const SEED = [
  { name: 'Northwind Coffee website', description: 'Redesign for a local coffee roaster. New Shopify storefront, menu page and wholesale ordering.', files: ['homepage-wireframe.fig', 'brand-guide.pdf', 'menu.pdf'], status: 'working' },
  { name: '2026 taxes', description: 'Gather everything for the accountant by March.', files: ['W2.pdf', '1099-INT.pdf', 'receipts.csv'], status: 'needs-input', prompt: 'confirm which receipts count as business expenses' },
  { name: 'Q1 board deck', description: 'Quarterly update for the board: revenue, hiring, roadmap.', files: ['metrics.xlsx', 'q4-deck.pptx'], status: 'done' },
  { name: 'Kitchen remodel', description: 'Quotes from contractors, cabinet options, and a budget that holds.', files: ['quotes.xlsx', 'floorplan.png'] },
  { name: 'Customer support bot', description: 'Prompts and test cases for the help center agent.', files: ['faq.md', 'eval-cases.json'] },
  { name: 'Marathon training', description: '18 week plan for the Chicago marathon in October.', files: ['plan.csv'] },
  { name: 'Spanish practice', description: 'Daily conversation practice and vocab lists.', files: [] },
  { name: 'Etsy shop: knit hats', description: 'Listings, pricing and photos for the winter collection.', files: ['listings.csv', 'hat-01.jpg', 'hat-02.jpg'] },
  { name: 'Acme Corp invoices', description: 'Monthly invoices and payment tracking for Acme.', files: ['march.pdf', 'april.pdf'] },
];
const TASKS = ['Reading the files', 'Drafting an outline', 'Checking the numbers', 'Writing a summary', 'Comparing options', 'Updating the plan', 'Polishing the draft'];
const PROMPTS = ['approve sending the email', 'pick between two drafts', 'confirm the budget total', 'answer a question about the brand colors', 'review the changes before they go out'];
const SAMPLE_FILES = ['budget.xlsx', 'logo.svg', 'notes.md', 'photos.jpg', 'app.py', 'contract.pdf', 'episode-1.mp3'];

let uid = 0;
const newId = () => `p${Date.now().toString(36)}${(uid++).toString(36)}`;
let projects = [];
let selectedId = null;
let suggestion = null;

function taken(except) {
  return projects.filter((p) => p.id !== except).map((p) => ({ icon: p.icon, color: p.color }));
}
function applyAuto(p) {
  const s = suggest(p, taken(p.id));
  if (p.auto) {
    p.icon = s.icon;
    p.color = s.color;
  }
  return s;
}
function makeProject(data) {
  const p = { id: newId(), name: '', description: '', files: [], auto: true, status: 'idle', progress: 0, task: '', prompt: '', updated: Date.now() - Math.random() * 6 * 864e5, ...data };
  applyAuto(p);
  return p;
}
function seed() {
  projects = [];
  for (const d of SEED) projects.push(makeProject(d));
  for (const p of projects) {
    if (p.status === 'working') { p.progress = 0.35; p.task = TASKS[1]; }
    if (p.status === 'done') p.unread = true;
  }
  selectedId = projects[0].id;
}
function load() {
  const saved = store.get('cpi-demo-v1');
  if (saved && Array.isArray(saved.projects) && saved.projects.length) {
    projects = saved.projects.filter((p) => p && p.id && ICON_MAP[p.icon] && PALETTE_MAP[p.color]);
    selectedId = saved.selectedId;
  }
  if (!projects.length) seed();
  if (!projects.some((p) => p.id === selectedId)) selectedId = projects[0].id;
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.set('cpi-demo-v1', { projects, selectedId }), 250);
}
const selected = () => projects.find((p) => p.id === selectedId);

/* ── Sidebar ────────────────────────────────────────────────────────── */
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function subline(p) {
  switch (p.status) {
    case 'working': return `Working · ${p.task || 'Thinking'}`;
    case 'needs-input': return 'Needs your input';
    case 'done': return `Done · ${ago(p.updated)}`;
    case 'error': return 'Couldn’t finish · retry';
    default: return `Updated ${ago(p.updated)}`;
  }
}
function iconAttrs(p, size, determinate) {
  const status = p.status === 'idle' ? '' : p.status;
  return `icon="${p.icon}" color="${p.color}" size="${size}" label="${esc(p.name || 'Untitled project')}"${status ? ` status="${status}"` : ''}${determinate && p.status === 'working' ? ` progress="${p.progress.toFixed(2)}"` : ''}`;
}
function syncIcon(el, p, determinate) {
  const want = { icon: p.icon, color: p.color, label: p.name || 'Untitled project' };
  for (const [k, v] of Object.entries(want)) if (el.getAttribute(k) !== v) el.setAttribute(k, v);
  if (p.status === 'idle') el.removeAttribute('status');
  else if (el.getAttribute('status') !== p.status) el.setAttribute('status', p.status);
  if (determinate && p.status === 'working') el.setAttribute('progress', p.progress.toFixed(2));
  else el.removeAttribute('progress');
}

function renderSidebar() {
  const list = $('#sbList');
  const ids = projects.map((p) => p.id).join();
  if (list.dataset.ids !== ids) {
    list.innerHTML = projects
      .map((p) => `<li><button class="sb-item" type="button" data-id="${p.id}"><project-icon ${iconAttrs(p, 30)}></project-icon><span class="sb-text"><span class="sb-name"></span><span class="sb-sub"></span></span></button></li>`)
      .join('');
    list.dataset.ids = ids;
  }
  for (const p of projects) {
    const btn = list.querySelector(`[data-id="${p.id}"]`);
    btn.setAttribute('aria-current', p.id === selectedId ? 'true' : 'false');
    syncIcon(btn.querySelector('project-icon'), p, false);
    btn.querySelector('.sb-name').textContent = p.name || 'Untitled project';
    const sub = btn.querySelector('.sb-sub');
    sub.textContent = subline(p);
    sub.dataset.status = p.status;
  }
  const need = projects.filter((p) => p.status === 'needs-input').length;
  const working = projects.filter((p) => p.status === 'working').length;
  const done = projects.filter((p) => p.status === 'done').length;
  const parts = [];
  if (need) parts.push(`<span class="attn">${need} need${need === 1 ? 's' : ''} you</span>`);
  if (working) parts.push(`${working} working`);
  if (done) parts.push(`${done} done`);
  $('#sbSummary').innerHTML = parts.join(' · ') || 'All quiet';
}

$('#sbList').addEventListener('click', (e) => {
  const btn = e.target.closest('.sb-item');
  if (!btn) return;
  select(btn.dataset.id);
});
function select(id) {
  selectedId = id;
  const p = selected();
  if (p.status === 'done') {
    // Opening a finished project reads it, like an unread mark.
    setTimeout(() => { if (p.status === 'done' && selectedId === p.id) { p.status = 'idle'; renderAll(); } }, 1400);
  }
  renderAll(true);
}

/* ── Detail ─────────────────────────────────────────────────────────── */
const STATUS_TEXT = { idle: 'Idle', working: 'Working', 'needs-input': 'Needs your input', done: 'Done', error: 'Couldn’t finish' };

function renderDetail(rebuild) {
  const p = selected();
  const root = $('#detail');
  suggestion = suggest(p, taken(p.id));
  if (rebuild || root.dataset.id !== p.id) {
    root.dataset.id = p.id;
    root.innerHTML = `
      <div class="d-head">
        <button class="d-icon-btn" type="button" id="openPicker" aria-label="Change icon">
          <project-icon id="bigIcon" ${iconAttrs(p, 64, true)}></project-icon>
          <span class="edit" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg></span>
        </button>
        <div class="d-title">
          <input class="d-name" id="dName" value="${esc(p.name)}" placeholder="Name your project" aria-label="Project name" autocomplete="off">
          <div class="d-status" id="dStatus"><span class="dot"></span><span></span></div>
        </div>
      </div>
      <div id="banner"></div>
      <div class="cards">
        <div class="card wide" id="iconCard"></div>
        <div class="card">
          <h3>Instructions</h3>
          <textarea id="dDesc" placeholder="What is this project for? Claude uses this to choose an icon.">${esc(p.description)}</textarea>
        </div>
        <div class="card">
          <h3>Files <span class="sb-sub" id="fileCount"></span></h3>
          <div class="files" id="dFiles"></div>
          <form class="file-add" id="fileForm"><input id="fileInput" placeholder="Add a file name, like budget.xlsx" aria-label="Add a file name" autocomplete="off"><button class="ghost-btn" type="submit">Add</button></form>
          <div class="samples">Try: ${SAMPLE_FILES.map((f) => `<button type="button" data-sample="${f}">${f}</button>`).join(' ')}</div>
        </div>
        <div class="card wide">
          <h3>Status <span class="sb-sub">Simulates Claude working in this project</span></h3>
          <div class="status-row">
            <button class="primary-btn" type="button" id="startTask">Start a task</button>
            <div class="seg" role="group" aria-label="Set status" id="statusSeg">
              ${['idle', 'working', 'needs-input', 'done', 'error'].map((s) => `<button type="button" data-status="${s}">${{ idle: 'Idle', working: 'Working', 'needs-input': 'Needs you', done: 'Done', error: 'Problem' }[s]}</button>`).join('')}
            </div>
          </div>
          <div class="legend">
            <span><project-icon icon="${p.icon}" color="${p.color}" size="24" status="working"></project-icon>Working</span>
            <span><project-icon icon="${p.icon}" color="${p.color}" size="24" status="needs-input"></project-icon>Needs you</span>
            <span><project-icon icon="${p.icon}" color="${p.color}" size="24" status="done"></project-icon>Done</span>
            <span><project-icon icon="${p.icon}" color="${p.color}" size="24" status="error"></project-icon>Problem</span>
          </div>
        </div>
      </div>`;
    bindDetail();
  }
  updateDetail();
}

function updateDetail() {
  const p = selected();
  syncIcon($('#bigIcon'), p, true);
  const st = $('#dStatus');
  st.dataset.status = p.status;
  st.lastElementChild.textContent = p.status === 'working' ? `Working · ${p.task} · ${Math.round(p.progress * 100)}%` : STATUS_TEXT[p.status];
  setHTML($('#banner'), p.status === 'needs-input'
    ? `<div class="banner"><project-icon icon="${p.icon}" color="${p.color}" size="28" status="needs-input"></project-icon><p>Claude needs you to <b>${esc(p.prompt || PROMPTS[0])}</b>.</p><button class="ghost-btn" type="button" id="respond">Approve and continue</button></div>`
    : p.status === 'error'
      ? `<div class="banner"><p>Claude couldn’t finish this task.</p><button class="ghost-btn" type="button" id="retry">Retry</button></div>`
      : '');
  document.querySelectorAll('#statusSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.status === p.status));
  document.querySelectorAll('.legend project-icon').forEach((el) => { el.setAttribute('icon', p.icon); el.setAttribute('color', p.color); });
  $('#startTask').disabled = p.status === 'working';
  $('#startTask').textContent = p.status === 'working' ? 'Working…' : 'Start a task';
  renderIconCard();
  renderFiles();
}

function renderIconCard() {
  const p = selected();
  const s = suggestion;
  const reasons = s.reasons.length ? `Picked from ${s.reasons.slice(0, 2).map((r) => `<b>${esc(r)}</b>`).join(' and ')}.` : 'Give the project a name or add files and an icon will follow.';
  const top = [{ icon: s.icon, color: s.color }, ...s.alternatives.slice(0, 6)];
  setHTML($('#iconCard'), `
    <h3>Icon
      <button type="button" class="auto-pill ${p.auto ? '' : 'off'}" id="autoPill" aria-pressed="${p.auto}">
        ${p.auto ? '✦ Auto' : 'Chosen by you · use auto'}
      </button>
    </h3>
    <div class="suggest-main">
      <project-icon icon="${s.icon}" color="${s.color}" size="40"></project-icon>
      <div class="suggest-why">
        ${p.auto ? 'Suggested' : 'Claude would suggest'} <b>${esc(ICON_MAP[s.icon].label.toLowerCase())}</b> in ${esc(PALETTE_MAP[s.color].label.toLowerCase())}. ${reasons}
        <div class="meter">Confidence <span class="bar"><i style="width:${Math.round(s.confidence * 100)}%"></i></span>${s.confidence >= 0.66 ? 'High' : s.confidence >= 0.33 ? 'Medium' : 'Low'}</div>
      </div>
    </div>
    <div class="alts"><span class="lbl">Other fits</span>
      ${top.map((a) => `<button type="button" class="alt" data-icon="${a.icon}" data-color="${a.color}" aria-pressed="${a.icon === p.icon}" title="${esc(ICON_MAP[a.icon].label)}"><project-icon icon="${a.icon}" color="${a.color}" size="30"></project-icon></button>`).join('')}
      <button type="button" class="ghost-btn" id="browseAll">Browse all ${ICONS.length}</button>
    </div>`);
}

function renderFiles() {
  const p = selected();
  setHTML($('#dFiles'), p.files.length
    ? p.files.map((f, i) => `<span class="chip">${esc(f)}<button type="button" data-remove="${i}" aria-label="Remove ${esc(f)}">×</button></span>`).join('')
    : '<span class="sb-sub">No files yet</span>');
  $('#fileCount').textContent = p.files.length ? `${p.files.length}` : '';
}

function edited() {
  const p = selected();
  p.updated = Date.now();
  applyAuto(p);
  renderSidebar();
  suggestion = suggest(p, taken(p.id));
  updateDetail();
  save();
}

function bindDetail() {
  const p = selected();
  $('#dName').addEventListener('input', (e) => { p.name = e.target.value; edited(); });
  $('#dDesc').addEventListener('input', (e) => { p.description = e.target.value; edited(); });
  $('#fileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#fileInput').value.trim();
    if (!v) return;
    p.files.push(...v.split(',').map((x) => x.trim()).filter(Boolean));
    $('#fileInput').value = '';
    edited();
  });
  $('#detail').onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.sample) { p.files.push(t.dataset.sample); edited(); }
    else if (t.dataset.remove) { p.files.splice(Number(t.dataset.remove), 1); edited(); }
    else if (t.id === 'openPicker' || t.id === 'browseAll') openPicker();
    else if (t.id === 'autoPill') { p.auto = !p.auto; edited(); }
    else if (t.classList.contains('alt')) { p.icon = t.dataset.icon; p.color = t.dataset.color; p.auto = t.dataset.icon === suggestion.icon && t.dataset.color === suggestion.color; edited(); }
    else if (t.id === 'startTask') startTask(p);
    else if (t.id === 'respond') { p.prompt = ''; startTask(p, p.progress || 0.5, true); }
    else if (t.id === 'retry') startTask(p);
    else if (t.closest('#statusSeg')) setStatus(p, t.dataset.status);
  };
}

/* ── Simulation ─────────────────────────────────────────────────────── */
const timers = new Map();
function stopTimer(p) { clearInterval(timers.get(p.id)); timers.delete(p.id); }
function setStatus(p, status) {
  stopTimer(p);
  p.status = status;
  p.updated = Date.now();
  if (status === 'working') startTask(p, p.progress || 0);
  if (status === 'needs-input' && !p.prompt) p.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  if (status === 'done' && p.id !== selectedId) p.unread = true;
  renderAll();
}
function startTask(p, from = 0, noPause = false) {
  stopTimer(p);
  p.status = 'working';
  p.progress = from;
  p.task = TASKS[Math.floor(Math.random() * TASKS.length)];
  // Some tasks stop halfway to ask the person something.
  const pauseAt = !noPause && Math.random() < 0.4 ? 0.45 + Math.random() * 0.3 : 2;
  timers.set(p.id, setInterval(() => {
    p.progress = Math.min(1, p.progress + 0.025 + Math.random() * 0.045);
    if (Math.random() < 0.18) p.task = TASKS[Math.floor(Math.random() * TASKS.length)];
    if (p.progress >= pauseAt) {
      stopTimer(p);
      p.status = 'needs-input';
      p.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
      p.updated = Date.now();
    } else if (p.progress >= 1) {
      stopTimer(p);
      p.status = Math.random() < 0.06 ? 'error' : 'done';
      p.progress = 0;
      p.updated = Date.now();
      if (p.status === 'done' && p.id === selectedId) {
        setTimeout(() => { if (p.status === 'done' && selectedId === p.id) { p.status = 'idle'; renderAll(); } }, 3500);
      }
    }
    renderAll();
  }, 450));
  renderAll();
}
let simTimer;
function simulate(on) {
  clearInterval(simTimer);
  if (!on) return;
  simTimer = setInterval(() => {
    const busy = projects.filter((p) => p.status === 'working').length;
    // Now and then, answer a waiting project that isn't open, so the demo keeps moving.
    const waiting = projects.filter((p) => p.status === 'needs-input' && p.id !== selectedId);
    if (waiting.length > 1 && Math.random() < 0.5) {
      const p = waiting[Math.floor(Math.random() * waiting.length)];
      p.prompt = '';
      return startTask(p, p.progress || 0.5, true);
    }
    if (busy >= 2) return;
    const idle = projects.filter((p) => (p.status === 'idle' || p.status === 'done') && p.id !== selectedId);
    if (idle.length) startTask(idle[Math.floor(Math.random() * idle.length)]);
  }, 3800);
}
$('#simToggle').addEventListener('change', (e) => { simulate(e.target.checked); store.set('cpi-sim', e.target.checked); });

/* ── Picker ─────────────────────────────────────────────────────────── */
const picker = $('#picker');
function iconCell(icon, pressed, cls = 'icon-cell') {
  return `<button type="button" class="${cls}" data-icon="${icon.name}" aria-pressed="${pressed}" title="${esc(icon.label)}" aria-label="${esc(icon.label)}">${toSvg(icon, { size: 22, strokeWidth: 1.6 })}</button>`;
}
function matchIcons(q) {
  q = q.trim().toLowerCase();
  if (!q) return ICONS;
  const words = q.split(/\s+/);
  const catWords = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label.toLowerCase()]));
  return ICONS.filter((i) => words.every((w) => i.name.includes(w) || i.tags.some((t) => t.startsWith(w)) || catWords[i.category].split(/\W+/).some((t) => t.startsWith(w))));
}
function renderPicker() {
  const p = selected();
  const q = $('#pickerSearch').value;
  const body = $('#pickerBody');
  if (q.trim()) {
    const hits = matchIcons(q);
    body.innerHTML = hits.length
      ? `<div class="group-label">${hits.length} match${hits.length === 1 ? '' : 'es'}</div><div class="icon-grid">${hits.map((i) => iconCell(i, i.name === p.icon)).join('')}</div>`
      : `<p class="empty">No icons match “${esc(q)}”.</p>`;
  } else {
    const sug = [suggestion.icon, ...suggestion.alternatives.map((a) => a.icon)];
    body.innerHTML =
      `<div class="group-label">Suggested for this project</div><div class="icon-grid">${sug.map((n) => iconCell(ICON_MAP[n], n === p.icon)).join('')}</div>` +
      CATEGORIES.map((c) => {
        const icons = ICONS.filter((i) => i.category === c.id);
        return `<div class="group-label">${c.label} <small>${icons.length}</small></div><div class="icon-grid">${icons.map((i) => iconCell(i, i.name === p.icon)).join('')}</div>`;
      }).join('');
  }
  body.style.color = inkOf(p.color);
  $('#pickerColors').innerHTML = PALETTE.map((c) => `<button type="button" class="swatch" role="radio" data-color="${c.id}" aria-checked="${c.id === p.color}" aria-label="${c.label}" style="--c:${isDark() ? c.dark : c.light}"></button>`).join('');
}
function openPicker() {
  $('#pickerSearch').value = '';
  renderPicker();
  picker.showModal();
  $('#pickerSearch').focus();
}
$('#pickerSearch').addEventListener('input', renderPicker);
$('#pickerBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-icon]');
  if (!b) return;
  const p = selected();
  p.icon = b.dataset.icon;
  p.auto = false;
  edited();
  renderPicker();
});
$('#pickerColors').addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  const p = selected();
  p.color = b.dataset.color;
  p.auto = false;
  edited();
  renderPicker();
});
$('#pickerAuto').addEventListener('click', () => {
  const p = selected();
  p.auto = true;
  edited();
  renderPicker();
});
picker.addEventListener('click', (e) => { if (e.target === picker) picker.close(); });

/* ── New project & reset ────────────────────────────────────────────── */
$('#newProject').addEventListener('click', () => {
  const p = makeProject({ updated: Date.now() });
  projects.unshift(p);
  selectedId = p.id;
  renderAll(true);
  $('#dName').focus();
  save();
});
$('#resetDemo').addEventListener('click', () => {
  for (const id of timers.keys()) clearInterval(timers.get(id));
  timers.clear();
  seed();
  renderAll(true);
  resumeWorking();
  save();
});

function renderAll(rebuild) {
  renderSidebar();
  renderDetail(rebuild);
  save();
}
function resumeWorking() {
  for (const p of projects) if (p.status === 'working') startTask(p, p.progress || 0.2, true);
}

/* ── Library ────────────────────────────────────────────────────────── */
let libColor = 'clay';
let libSelected = null;
function renderLibrary() {
  const q = $('#libSearch').value;
  const size = Number($('#libSize').value);
  const tiles = $('#libTiles').checked;
  const grid = $('#libGrid');
  grid.classList.toggle('tiles', tiles);
  grid.style.setProperty('--sz', `${size}px`);
  grid.style.setProperty('--ink', tiles ? inkOf(libColor) : 'var(--text)');
  const stroke = size <= 20 ? 2 : size >= 40 ? 1.5 : 1.75;
  const cell = (i) => `<button type="button" class="lib-cell" data-icon="${i.name}" aria-pressed="${i.name === libSelected}"><span class="tile">${toSvg(i, { size, strokeWidth: stroke })}</span><span class="nm">${i.name}</span></button>`;
  if (q.trim()) {
    const hits = matchIcons(q);
    grid.innerHTML = hits.length
      ? `<div class="group-label">${hits.length} match${hits.length === 1 ? '' : 'es'}</div><div class="icon-grid">${hits.map(cell).join('')}</div>`
      : `<p class="empty">No icons match “${esc(q)}”. Try a broader word.</p>`;
  } else {
    grid.innerHTML = CATEGORIES.map((c) => {
      const icons = ICONS.filter((i) => i.category === c.id);
      return `<div class="group-label">${c.label} <small>${icons.length}</small></div><div class="icon-grid">${icons.map(cell).join('')}</div>`;
    }).join('');
  }
  $('#libColors').innerHTML = PALETTE.map((c) => `<button type="button" class="swatch" role="radio" data-color="${c.id}" aria-checked="${c.id === libColor}" aria-label="${c.label}" style="--c:${isDark() ? c.dark : c.light}"></button>`).join('');
}
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
function renderLibPanel() {
  const panel = $('#libPanel');
  if (!libSelected) { panel.hidden = true; return; }
  const i = ICON_MAP[libSelected];
  panel.hidden = false;
  panel.innerHTML = `
    <button class="icon-btn close" type="button" data-act="close" aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <h3>${esc(i.label)}</h3>
    <div class="previews">
      <project-icon icon="${i.name}" color="${libColor}" size="56"></project-icon>
      <project-icon icon="${i.name}" color="${libColor}" size="32" status="working"></project-icon>
      <project-icon icon="${i.name}" color="${libColor}" size="24" status="needs-input"></project-icon>
      <project-icon icon="${i.name}" color="${libColor}" size="20" status="done"></project-icon>
    </div>
    <div class="tags">${CATEGORIES.find((c) => c.id === i.category).label} · ${i.tags.slice(0, 10).map(esc).join(', ')}</div>
    <div class="row">
      <a class="primary-btn" href="svg/${i.name}.svg" download>Download SVG</a>
      <button class="ghost-btn" type="button" data-act="copy-svg">Copy SVG</button>
      <button class="ghost-btn" type="button" data-act="copy-tag">Copy HTML</button>
    </div>`;
}
$('#libGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-icon]');
  if (!b) return;
  libSelected = b.dataset.icon;
  document.querySelectorAll('.lib-cell[aria-pressed="true"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true');
  renderLibPanel();
});
$('#libPanel').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'close') { libSelected = null; renderLibPanel(); renderLibrary(); return; }
  const i = ICON_MAP[libSelected];
  const text = act === 'copy-svg' ? toSvg(i) : `<project-icon icon="${i.name}" color="${libColor}" size="32"></project-icon>`;
  try { await navigator.clipboard.writeText(text); showToast('Copied'); } catch { showToast('Copy is blocked here'); }
});
$('#libColors').addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  libColor = b.dataset.color;
  renderLibrary();
  renderLibPanel();
});
['libSearch', 'libSize', 'libTiles'].forEach((id) => $(`#${id}`).addEventListener('input', renderLibrary));

/* ── About page art ─────────────────────────────────────────────────── */
function renderAbout() {
  const set = ['briefcase', 'store', 'invoice', 'browser', 'sparkles', 'pen-line', 'palette', 'graduation-cap', 'house', 'heart-pulse', 'plane', 'coffee', 'gamepad', 'scale', 'paw', 'rocket'];
  $('#artSet').innerHTML = `<div class="art-grid">${set.map((n) => `<project-icon icon="${n}" color="${suggest({ name: n }).color}" size="36"></project-icon>`).join('')}</div>`;
  $('#artSuggest').innerHTML = `<div class="art-row"><project-icon id="artIcon" icon="folder" color="stone" size="44"></project-icon><span class="typed" id="artTyped"></span></div><div class="sb-sub" id="artWhy" style="width:100%"></div>`;
  $('#artStatus').innerHTML = `<div class="art-status">
    <span><project-icon icon="browser" color="sky" size="32" status="working"></project-icon>Working</span>
    <span><project-icon icon="taxes" color="stone" size="32" status="needs-input"></project-icon>Needs you</span>
    <span><project-icon icon="presentation" color="blue" size="32" status="done"></project-icon>Done</span>
    <span><project-icon icon="robot" color="clay" size="32" status="error"></project-icon>Problem</span></div>`;
  typeLoop();
}
let typeTimer;
function typeLoop() {
  const names = ['Garden planner', 'Acme Corp invoices', 'Wedding playlist', 'Thesis: coral reefs', 'Puppy training', 'Portfolio site', 'Sourdough recipes'];
  let n = 0, i = 0, dir = 1;
  clearInterval(typeTimer);
  typeTimer = setInterval(() => {
    const el = $('#artTyped');
    if (!el || currentView !== 'about') return;
    const word = names[n];
    i += dir;
    if (i > word.length + 12) dir = -1;
    if (i <= 0 && dir === -1) { dir = 1; n = (n + 1) % names.length; }
    const text = word.slice(0, Math.max(0, Math.min(i, word.length)));
    el.textContent = text;
    const s = suggest({ name: text });
    const icon = $('#artIcon');
    icon.setAttribute('icon', s.icon);
    icon.setAttribute('color', s.color);
    $('#artWhy').textContent = s.reasons.length ? `Matched ${s.reasons[0]}` : ' ';
  }, reducedMotion.matches ? 400 : 110);
}

/* ── Views ──────────────────────────────────────────────────────────── */
let currentView = 'demo';
let aboutRendered = false;
function route() {
  const view = (location.hash || '#demo').slice(1);
  currentView = ['demo', 'library', 'about'].includes(view) ? view : 'demo';
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.dataset.view !== currentView));
  document.querySelectorAll('.tabs a').forEach((a) => a.setAttribute('aria-current', a.dataset.view === currentView ? 'page' : 'false'));
  if (currentView === 'library') renderLibrary();
  if (currentView === 'about') { if (!aboutRendered) renderAbout(); aboutRendered = true; }
  $('#libPanel').hidden = currentView !== 'library' || !libSelected;
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

/* ── Start ──────────────────────────────────────────────────────────── */
load();
renderAll(true);
resumeWorking();
const simOn = store.get('cpi-sim');
$('#simToggle').checked = simOn !== false;
simulate($('#simToggle').checked);
route();
setInterval(() => renderSidebar(), 30000);
