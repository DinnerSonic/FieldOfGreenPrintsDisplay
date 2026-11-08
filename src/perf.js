// Performance log, for chasing lag on the iPad. Run from the control page (control.html):
// start/stop a log, mark the moment you see lag, switch effects off, or run an auto test.
// Nothing here runs until logging starts, and nothing shows on the kiosk's screen.
// The log is autosaved, so it survives switching apps or the page being reloaded by iOS, and
// every finished log is uploaded for the control page.
//
// What it can measure: the page's own frame rate (requestAnimationFrame) and how late timers
// run (the main thread being busy). iOS runs transform animations like the snow separately from
// the page, so they can stutter while these numbers look fine.

import './perf.css';

const STORE_KEY = 'fogp_perf_log';
const MAX_MS = 30 * 60 * 1000;
const TICK_MS = 10 * 1000;
const BEAT_MS = 100;
const IGNORE_GAP_MS = 5000; // longer than this: the app was asleep, not lagging
const MAX_SLOW_EVENTS = 200;

// Auto tests, a few seconds per step:
//   themes: every theme, on home then Be Right Back.
//   pieces: each theme with falling pieces, on home, at more and more pieces.
// (Earlier runs found the falling pieces are the main cost; lights and floating motion cost
// nothing measurable.)
const AUTO_STEP_MS = 10 * 1000;
const AUTO_SETTLE_MS = 2000; // the screen or theme change itself hitches; measure after it
const PIECE_COUNTS = [32, 64, 96, 128];
let AUTO_TESTS = { themes: [], pieces: [] };

let label = () => '';
let go = () => {};
let themes = { list: [], set: async () => {}, restore: () => {}, pieces: () => {} };
let log = null;     // the running log, or null
let raf = 0, beat = 0;

/**
 * getLabel: names the screen showing. goTo('home' | 'brb'): moves there.
 * themeControl, for the auto tests: { list: [{ id, label, particles }], set(id): Promise,
 * restore(), pieces(count | null) }.
 */
export function initPerf(getLabel, goTo, themeControl) {
  label = getLabel;
  go = goTo;
  themes = themeControl;
  AUTO_TESTS = {
    themes: themes.list.flatMap((theme) => ['home', 'brb'].map((where) => ({ theme, where }))),
    pieces: themes.list.filter((t) => t.particles)
      .flatMap((theme) => PIECE_COUNTS.map((count) => ({ theme, where: 'home', count }))),
  };
  document.addEventListener('visibilitychange', () => {
    if (!log) return;
    event(document.hidden ? 'app hidden' : 'app visible');
    log.lastFrame = 0;
    log.lastBeat = 0;
  });
}

// Where finished logs are sent (the remote control's Drive folder), if anywhere.
let uploader = null;
export function setPerfUploader(fn) { uploader = fn; }

function upload(name, text) {
  if (uploader && text) Promise.resolve(uploader(name, text)).catch(() => {});
}

/** Commands from the control page: start | stop | mark | auto | auto-pieces | upload. */
export function perfCommand(action) {
  if (action === 'start') {
    if (log) return 'already logging';
    start();
    return 'logging started';
  }
  if (action === 'auto' || action === 'auto-pieces') {
    if (log) return 'already logging';
    runAuto(action === 'auto' ? 'themes' : 'pieces');
    return `auto test (${log.auto.kind}) started`;
  }
  if (action === 'mark') {
    if (!log) return 'not logging';
    mark();
    return `lag marked (${log.marks})`;
  }
  if (action === 'stop') {
    if (!log) return 'not logging';
    stop('stopped from the control page');
    return 'stopped; log saved';
  }
  if (action === 'upload') {
    if (log) save(false);
    const text = savedReport();
    if (!text) return 'no log saved yet';
    upload(log ? 'log in progress' : 'saved log', text);
    return 'uploading the saved log';
  }
  throw new Error('unknown log action');
}

/** For the control page's status. */
export function perfState() {
  return {
    logging: !!log,
    auto: log && log.auto && !log.auto.done ? `${log.auto.kind} ${log.auto.i + 1}/${log.auto.steps.length}` : null,
    marks: log ? log.marks : 0,
    effectsOff: [...off],
    numbers: numbersOn(),
  };
}

export function perfSetEffects(ids) {
  setEffectsOff((Array.isArray(ids) ? ids : []).filter((id) => EFFECTS.includes(id)));
  return `effects off: ${[...off].join(', ') || 'none'}`;
}

// Labels on the falling pieces (S3, M2, L1: size and number), to point out which ones judder.
const numbersOn = () => document.documentElement.hasAttribute('data-fx-numbers');
export function perfSetNumbers(on) {
  document.documentElement.toggleAttribute('data-fx-numbers', !!on);
  if (log) event(`test: piece numbers ${on ? 'on' : 'off'}`);
  return `numbers ${on ? 'on' : 'off'}`;
}

// Effects that can be switched off for a test (not remembered: a restart turns them back on).
const EFFECTS = ['snow', 'lights', 'motion'];
const off = new Set();

function setEffectsOff(ids) {
  const before = [...off].join(', ');
  off.clear();
  ids.forEach((id) => off.add(id));
  document.documentElement.dataset.perfOff = ids.join(' ');
  if (log && ids.join(', ') !== before) event(`test: effects off: ${ids.join(', ') || 'none'}`);
  perfScreenChanged();
}

// ─────────── Auto test ───────────
function runAuto(kind) {
  start();
  log.auto = { kind, steps: AUTO_TESTS[kind], i: -1, cur: null, results: [], timer: 0 };
  event(`auto test (${kind}): ${log.auto.steps.length} steps of ${AUTO_STEP_MS / 1000} s`);
  nextAutoStep();
}

async function nextAutoStep() {
  const a = log && log.auto;
  if (!a) return;
  if (a.cur) a.results.push(a.cur);
  a.cur = null;
  a.i++;
  if (a.i >= a.steps.length) {
    endAuto();
    stop('auto test finished');
    return;
  }
  const { theme, where, count } = a.steps[a.i];
  await themes.set(theme.id);
  if (!log || log.auto !== a || a.done) return; // stopped meanwhile
  if (count != null) themes.pieces(count);
  go(where);
  const pieces = [...document.querySelectorAll('.fx-sprite')].filter((s) => s.getClientRects().length).length;
  const daypart = document.documentElement.dataset.daypart;
  a.cur = {
    name: `${theme.label}${daypart ? ' (' + daypart + ')' : ''} · ${where === 'brb' ? 'Be right back' : 'home'} · ${pieces} falling pieces`,
    from: performance.now() + AUTO_SETTLE_MS, ...newStats(),
  };
  a.timer = setTimeout(nextAutoStep, AUTO_STEP_MS);
}

/** True while the auto test is switching themes, so the app leaves the theme alone. */
export function perfAutoRunning() {
  return !!(log && log.auto && !log.auto.done);
}

// Put things back as they were before the test.
function endAuto() {
  log.auto.done = true;
  clearTimeout(log.auto.timer);
  setEffectsOff([]);
  if (log.auto.kind === 'pieces') themes.pieces(null);
  themes.restore();
  go('home');
}

// The step being measured right now, if any.
function autoStep(now) {
  const cur = log.auto && log.auto.cur;
  return cur && now >= cur.from ? cur : null;
}

/** Call after anything that may change the screen. */
export function perfScreenChanged() {
  if (!log) return;
  const key = screenKey();
  if (key === log.screen) return;
  log.screen = key;
  event('screen: ' + key);
  countLater(key);
}

/** Time something (e.g. a background upload check). Returns the function that ends it. */
export function perfSpan(name) {
  if (!log) return () => {};
  const t0 = performance.now();
  return () => { if (log) event(`${name} ${Math.round(performance.now() - t0)} ms`); };
}

// ─────────── Logging ───────────
const newStats = () => ({ ms: 0, frames: 0, o25: 0, o50: 0, o100: 0, o250: 0, worst: 0, stalls: 0 });

function start() {
  const now = performance.now();
  log = {
    startedAt: new Date(), t0: now, screen: screenKey(), env: environment(),
    segments: new Map(), ticks: [], events: [], recent: [], marks: 0, slowEvents: 0, slowDropped: 0,
    tick: newStats(), nextTick: now + TICK_MS, tickCount: 0, lastFrame: 0, lastBeat: 0,
  };
  event('screen: ' + log.screen);
  countLater(log.screen);
  raf = requestAnimationFrame(frame);
  beat = setInterval(heartbeat, BEAT_MS);
  save(false);
}

function stop(why) {
  if (log.auto && !log.auto.done) {
    event(`auto test stopped early, at step ${log.auto.i + 1}`);
    endAuto();
  }
  cancelAnimationFrame(raf);
  clearInterval(beat);
  event(why);
  save(true);
  upload(log.auto ? `auto test (${log.auto.kind})` : 'log', savedReport());
  log = null;
}

// Once a screen has settled, note how much is running on it, and what's in the page.
function countLater(key) {
  setTimeout(() => {
    if (!log || log.screen !== key) return;
    const seg = segment();
    seg.anims = runningAnimations();
    seg.elements = document.querySelectorAll('*').length;
    snapshot();
  }, 1000);
}

// ─────────── What's loaded ───────────
// Drawn at all: false if it or anything around it is display:none.
const shown = (el) => !!el && el.isConnected && el.getClientRects().length > 0;

function nameOf(el) {
  if (!el) return '?';
  if (el.dataset.screen) return el.dataset.screen;
  if (el.dataset.sign) return 'sign:' + el.dataset.sign;
  if (el.id) return '#' + el.id;
  return '.' + (el.classList[0] || el.tagName.toLowerCase());
}

// Which screen (or part of the page) an element belongs to.
function placeOf(el) {
  if (!el) return '?';
  if (el.id === 'stage') return 'home';
  const panel = el.closest('.panel, .camera, .phone, .editor');
  if (panel) return nameOf(panel);
  if (el.closest('.home, .wall') || el.matches('#stage > .candy, .pride-btn')) return 'home';
  if (el.closest('.fx-particles, .fx-deco')) return 'decorations';
  return nameOf(el);
}

function snapshot(prefix = '') {
  const stage = document.querySelector('#stage');
  const panels = [...stage.querySelectorAll('.panel')].filter(shown).map(nameOf);
  const fx = document.querySelector('.fx-particles');
  const deco = document.querySelector('.fx-deco');
  const fxAt = fx && fx.isConnected ? placeOf(fx.parentElement) + (shown(fx) ? '' : ' but switched off') : 'none';
  const parts = [
    `drawn: ${panels.length ? panels.join(', ') : 'no screens'}`,
    `home ${shown(stage.querySelector('.home')) ? 'drawn' : 'hidden'}`,
    `snow/particles on ${fxAt}${fx && fx.isConnected ? ` (${fx.children.length} sprites)` : ''}`,
    `lights/ground ${deco && shown(deco) ? 'on ' + placeOf(deco.parentElement) : 'off'}`,
    `camera ${shown(stage.querySelector('#camera')) ? 'open' : 'closed'}`,
    `${document.querySelectorAll('*').length} elements`,
    `${document.querySelectorAll('style').length} style tags`,
    `${document.querySelectorAll('img, video, canvas').length} img/video/canvas`,
  ];
  event(`${prefix}loaded: ${parts.join(' · ')}`);

  // Every running animation, grouped by what it is and where it lives.
  let anims = [];
  try { anims = document.getAnimations(); } catch (e) {}
  const groups = new Map();
  for (const a of anims) {
    const target = a.effect && a.effect.target;
    const what = (a.animationName || a.transitionProperty || 'animation')
      + (a.effect && a.effect.pseudoElement ? a.effect.pseudoElement : '')
      + (a.playState !== 'running' ? ` (${a.playState})` : '')
      + (target && !shown(target) ? ' (not drawn)' : '');
    const where = placeOf(target);
    const key = `${where}|${what}`;
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  const byPlace = new Map();
  for (const [key, n] of groups) {
    const [where, what] = key.split('|');
    if (!byPlace.has(where)) byPlace.set(where, []);
    byPlace.get(where).push(n > 1 ? `${what} x${n}` : what);
  }
  event(`${prefix}animations (${anims.length}): ` + ([...byPlace].map(([w, list]) => `${w}: ${list.join(', ')}`).join(' | ') || 'none'));
}

function frame(now) {
  if (!log) return;
  raf = requestAnimationFrame(frame);
  const gap = log.lastFrame ? now - log.lastFrame : 0;
  log.lastFrame = now;
  if (!gap || gap > IGNORE_GAP_MS) return;
  for (const s of [segment(), log.tick, autoStep(now)]) {
    if (!s) continue;
    s.ms += gap;
    s.frames++;
    if (gap > 25) s.o25++;
    if (gap > 50) s.o50++;
    if (gap > 100) s.o100++;
    if (gap > 250) s.o250++;
    if (gap > s.worst) s.worst = gap;
  }
  log.recent.push([now, gap]);
  if (log.recent.length > 240) log.recent.shift();
  if (gap > 100) slowEvent(`slow frame ${Math.round(gap)} ms`);
}

function heartbeat() {
  if (!log) return;
  const now = performance.now();
  const late = log.lastBeat ? now - log.lastBeat - BEAT_MS : 0;
  log.lastBeat = now;
  if (late >= 50 && late < IGNORE_GAP_MS) {
    segment().stalls++;
    log.tick.stalls++;
    const step = autoStep(now);
    if (step) step.stalls++;
    if (late >= 100) slowEvent(`main thread busy ${Math.round(late)} ms`);
  }
  if (now >= log.nextTick) {
    log.nextTick = now + TICK_MS;
    if (log.tick.frames) log.ticks.push({ t: now - log.t0, screen: log.screen, ...log.tick });
    log.tick = newStats();
    // Once a minute, even without a screen change: shows if anything builds up over time.
    if (++log.tickCount % 6 === 0) snapshot('(1 min) ');
    if (now - log.t0 >= MAX_MS) stop('stopped automatically after 30 min');
    else save(false);
  }
}

function segment() {
  let seg = log.segments.get(log.screen);
  if (!seg) log.segments.set(log.screen, seg = { ...newStats(), anims: null, elements: null });
  return seg;
}

function event(text) { log.events.push(`${clock(performance.now() - log.t0)}  ${text}`); }

function slowEvent(text) {
  if (log.slowEvents++ < MAX_SLOW_EVENTS) event(text);
  else log.slowDropped++;
}

function mark() {
  const now = performance.now();
  const gaps = log.recent.filter(([t]) => now - t <= 3000).map(([, g]) => g);
  const ms = gaps.reduce((a, b) => a + b, 0);
  const rate = ms ? (gaps.length * 1000 / ms).toFixed(1) : '-';
  log.marks++;
  event(`*** LAG SEEN *** last 3 s: ${rate} fps, worst frame ${Math.round(Math.max(0, ...gaps))} ms`);
  save(false);
}

function screenKey() {
  const html = document.documentElement.dataset;
  return `${html.theme || 'classic'}${html.daypart ? '/' + html.daypart : ''} ${label()}`
    + (off.size ? ` [off: ${[...off].join(', ')}]` : '')
    + (html.fxDebug ? ` [${html.fxDebug}]` : '');
}

function runningAnimations() {
  try { return document.getAnimations().length; } catch (e) { return null; }
}

function environment() {
  const stage = document.querySelector('#stage');
  const r = stage.getBoundingClientRect();
  return [
    navigator.userAgent,
    `screen ${screen.width}x${screen.height} @${devicePixelRatio}x · viewport ${innerWidth}x${innerHeight}`
      + ` · stage ${stage.offsetWidth}x${stage.offsetHeight} scale ${(r.width / stage.offsetWidth).toFixed(3)}`,
    `page open ${clock(performance.now())} when logging started`,
  ];
}

// ─────────── Report ───────────
const pad = (v, n) => String(v).padStart(n);
const fps = (s) => (s.ms ? (s.frames * 1000 / s.ms).toFixed(1) : '-');

function clock(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return `${h ? h + ':' + String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}`;
}

function report(finished) {
  const row = (s) => `${pad(fps(s), 5)} ${pad(s.o25, 5)} ${pad(s.o50, 5)} ${pad(s.o100, 5)} ${pad(s.o250, 5)} ${pad(Math.round(s.worst), 6)} ${pad(s.stalls, 6)}`;
  const head = '  fps >25ms >50ms  >100  >250  worst stalls';
  const lines = [
    'FoGP performance log',
    `${document.querySelector('#buildStamp')?.textContent || ''} · started ${log.startedAt.toLocaleString()} · logged ${clock(performance.now() - log.t0)}`,
    finished ? 'Status: stopped normally' : 'Status: still running at last autosave (the app was closed or reloaded before it stopped)',
    ...log.env,
    `Lag marks: ${log.marks}`,
    '',
  ];
  const auto = log.auto ? [...log.auto.results, ...(log.auto.cur && !log.auto.results.includes(log.auto.cur) ? [log.auto.cur] : [])] : [];
  if (auto.length) {
    lines.push(`AUTO TEST: ${log.auto.kind} (${AUTO_STEP_MS / 1000} s per step, measured after the first ${AUTO_SETTLE_MS / 1000} s)`, `${head}  step`);
    for (const s of auto) lines.push(`${row(s)}  ${s.name}`);
    lines.push('');
  }
  lines.push(
    'BY SCREEN (frame counts; worst in ms)',
    `${head}   time  anims elems  screen`,
  );
  for (const [key, s] of log.segments) {
    lines.push(`${row(s)} ${pad(clock(s.ms), 6)} ${pad(s.anims ?? '-', 6)} ${pad(s.elements ?? '-', 5)}  ${key}`);
  }
  lines.push('', 'EVERY 10 SECONDS', `${head}    at  screen`);
  for (const t of log.ticks) lines.push(`${row(t)} ${pad(clock(t.t), 5)}  ${t.screen}`);
  lines.push('', 'EVENTS', ...log.events);
  if (log.slowDropped) lines.push(`(${log.slowDropped} more slow events not listed)`);
  return lines.join('\n');
}

function save(finished) {
  try { localStorage.setItem(STORE_KEY, report(finished)); } catch (e) {}
}

function savedReport() {
  try { return localStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; }
}
