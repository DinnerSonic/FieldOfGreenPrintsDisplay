// Theme runtime: loads the selected theme and shows its decorations.
//
// To keep the older iPad light, there is only ever ONE set of decorations (garland + ground,
// and one set of falling/rising particle layers) for the active theme, and it is moved onto
// whichever screen is showing. Screens you can't see hold no decoration layers and run no
// decoration animations; switching to Classic removes everything.
//
// A theme module (src/themes/<name>/index.js) imports its own CSS and exports:
//   subTone:   'dark' | 'light'  – background of the forms/QR/credits screens (dark = light text)
//   garland:   { colors: [...], shape: 'bulb' | 'heart' } | null  – across the top of home + night screens
//   ground:    'snowbank' | 'fog' | null                          – along the bottom of home, night, day screens
//   particles: [{ sprites: [svg shape centred on 0,0, ...], size, count, dir: 'down' | 'up', speed, drift }]
//              (size = sprite box in px, speed = px per second, drift = sideways sway in px)
//              Keep the total count across layers to about 15: each piece is its own moving layer,
//              and measured on the iPad, 14 run at a steady 60 fps while 29 already drop frames.
//   frame:     { home, picker, night, day, sub }  – colour for the strip iOS keeps at the bottom
//   daypart:   optional { nightFrom: 18 } – evening switch. Sets <html data-daypart="day|night">
//              so the theme's CSS can change with the clock; subTone and frame may then be
//              given per daypart: { day: ..., night: ... }.

import './runtime.css';
import { themeById } from './index.js';

const NIGHT = ['brb', 'at530', 'lunch'];
const DAY = ['bulk', 'otherbooth'];

/** Tag screens by kind so theme CSS can style them as groups. */
export function markScreens(stage) {
  for (const s of NIGHT) stage.querySelector(`[data-sign="${s}"]`)?.classList.add('scr-night');
  stage.querySelector('#thanks')?.classList.add('scr-night');
  for (const s of DAY) stage.querySelector(`[data-sign="${s}"]`)?.classList.add('scr-day');
  for (const sel of ['.pink-bg', '[data-screen="credits"]', '[data-screen="pride"]', '[data-sign="saved"]', '.phone']) {
    stage.querySelectorAll(sel).forEach((el) => el.classList.add('scr-sub'));
  }
}

let current = { id: 'classic', cfg: null };
let fx = null;      // { deco, particles, style } for the active theme
let token = 0;

/** Switch themes. Downloads the theme's files the first time it's used. */
export async function setTheme(id) {
  if (current.id === id) return false;
  const my = ++token;
  const entry = themeById(id);
  let cfg = null;
  if (entry.load) {
    try { cfg = (await entry.load()).default; }
    catch (e) { console.warn('theme failed to load; staying on the current one', e); return false; }
  }
  if (my !== token) return false; // a newer switch started meanwhile
  removeFx();
  current = { id: entry.id, cfg };
  document.documentElement.dataset.theme = entry.id;
  updateDaypart();
  if (cfg) fx = buildFx(cfg);
  return true;
}

// Day/evening for themes that change with the clock (e.g. Holiday's evening night sky).
let daypart = 'day';
// Only themes with a `daypart` setting give subTone/frame as { day, night }.
const perDaypart = (v) => (current.cfg && current.cfg.daypart && v && typeof v === 'object' ? v[daypart] : v);

/** Re-check the clock. Returns true if the theme's look changed (call every minute or so). */
export function updateDaypart(now = new Date()) {
  const cfg = current.cfg;
  const html = document.documentElement;
  const next = cfg && cfg.daypart && now.getHours() >= cfg.daypart.nightFrom ? 'night' : 'day';
  const changed = next !== daypart;
  daypart = next;
  if (cfg && cfg.daypart) html.dataset.daypart = daypart; else delete html.dataset.daypart;
  html.dataset.subTone = (cfg && perDaypart(cfg.subTone)) || 'light';
  return changed && !!(cfg && cfg.daypart);
}

export const currentThemeId = () => current.id;

// Which kind of screen is showing.
function screenGroup(state) {
  if (state.signs) {
    if (state.signs === 'picker') return 'picker';
    if (NIGHT.includes(state.signs)) return 'night';
    if (DAY.includes(state.signs)) return 'day';
    return 'sub';
  }
  if (state.screen === 'home') return 'home';
  if (state.screen === 'thanks') return 'night';
  return 'sub';
}

/** Colour for the bottom strip, or null to use the classic colours. */
export function themeFrameColor(state) {
  return current.cfg ? perDaypart(current.cfg.frame)[screenGroup(state)] : null;
}

/** Move the decorations onto the screen that's showing (or take them off if it gets none). */
export function placeDecorations(state, stage) {
  if (!fx) return;
  const group = screenGroup(state);
  let target = null;
  if (group === 'home') target = stage.querySelector('.wall');
  else if (group === 'picker') target = stage.querySelector('#signsPicker');
  else if (group === 'night' || group === 'day') target = state.signs ? stage.querySelector(`[data-sign="${state.signs}"]`) : stage.querySelector('#thanks');

  if (!target) { fx.deco.remove(); fx.particles.remove(); return; }
  fx.deco.hidden = group === 'picker';
  fx.deco.classList.toggle('no-garland', group === 'day');
  if (group === 'home') {
    // Home: wallpaper, particles, garland/ground, then the content on top.
    if (target.nextElementSibling !== fx.particles) target.after(fx.particles);
    if (fx.particles.nextElementSibling !== fx.deco) fx.particles.after(fx.deco);
  } else if (target.firstElementChild !== fx.particles) {
    target.prepend(fx.deco);
    target.prepend(fx.particles);
  }
}

function removeFx() {
  if (!fx) return;
  fx.deco.remove();
  fx.particles.remove();
  fx.style.remove();
  fx = null;
}

// ─────────── Builders ───────────

const STAGE_H = 768;
const GOLDEN = 0.618034;

function buildFx(cfg) {
  const deco = document.createElement('div');
  deco.className = 'fx-deco';
  if (cfg.garland) deco.insertAdjacentHTML('beforeend', `<div class="fx-garland">${garlandSvg(cfg.garland)}</div>`);
  if (cfg.ground) deco.insertAdjacentHTML('beforeend', `<div class="fx-ground">${GROUNDS[cfg.ground]}</div>`);

  const particles = document.createElement('div');
  particles.className = 'fx-particles';
  const style = document.createElement('style');
  let css = '';
  // Every sprite is its own tiny moving layer. A single tall image holding all of them costs
  // tens of MB of graphics memory on the iPad, and iOS redraws parts of it as it moves (stutter).
  (cfg.particles || []).forEach((p, i) => {
    const { size, count, speed, drift } = p;
    const sign = p.dir === 'up' ? -1 : 1;
    const travel = STAGE_H + size;
    const dur = travel / speed;
    css += `.fx-l${i}{${p.dir === 'up' ? 'bottom' : 'top'}:-${size}px;width:${size}px;height:${size}px;animation:fx-k${i} ${dur.toFixed(2)}s linear infinite}`
      + `@keyframes fx-k${i}{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(${drift}px,${sign * travel / 2}px,0)}100%{transform:translate3d(0,${sign * travel}px,0)}}`;
    p.sprites.forEach((shape, j) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-size / 2} ${-size / 2} ${size} ${size}">${shape}</svg>`;
      css += `.fx-s${i}-${j}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}")}`;
    });
    for (let n = 0; n < count; n++) {
      const sprite = document.createElement('div');
      sprite.className = `fx-sprite fx-l${i} fx-s${i}-${n % p.sprites.length}`;
      // Evenly spread in time, golden-ratio spread across the width: no visible rows or columns.
      sprite.style.left = `${((n * GOLDEN + i * 0.27) % 1) * 1104 - 40 - size / 2}px`;
      sprite.style.animationDelay = `${(-dur * n / count).toFixed(2)}s`;
      particles.append(sprite);
    }
  });
  style.textContent = css;
  document.head.append(style);
  return { deco, particles, style };
}

// Bulbs or hearts hanging from a sagging string. Static shapes, plus two pre-drawn glow
// layers (alternate items) that CSS fades in turn – cheap twinkling.
const SHAPES = {
  bulb: {
    base: (c) => `<rect x="-3.5" y="-1" width="7" height="7" rx="1.5" fill="#2d4a2f"/><ellipse cx="0" cy="15" rx="7" ry="10" fill="${c}"/><ellipse cx="-2.2" cy="11" rx="2" ry="3.2" fill="#fff" opacity=".55"/>`,
    glow: (c) => `<ellipse cx="0" cy="15" rx="16" ry="20" fill="${c}" opacity=".22"/><ellipse cx="0" cy="15" rx="10" ry="13" fill="${c}" opacity=".35"/><ellipse cx="0" cy="15" rx="5" ry="7" fill="#fff" opacity=".45"/>`,
  },
  heart: {
    base: (c) => `<line x1="0" y1="0" x2="0" y2="6" stroke="#7a2a4a" stroke-width="1.5"/><path transform="translate(0 15) scale(1.25)" d="M0 7C-9 1-10-6-5-8-2-9 0-7 0-5 0-7 2-9 5-8 10-6 9 1 0 7Z" fill="${c}"/><ellipse cx="-4" cy="9.5" rx="2" ry="1.4" fill="#fff" opacity=".5"/>`,
    glow: (c) => `<path transform="translate(0 15) scale(2.4)" d="M0 7C-9 1-10-6-5-8-2-9 0-7 0-5 0-7 2-9 5-8 10-6 9 1 0 7Z" fill="${c}" opacity=".25"/><path transform="translate(0 15) scale(1.6)" d="M0 7C-9 1-10-6-5-8-2-9 0-7 0-5 0-7 2-9 5-8 10-6 9 1 0 7Z" fill="${c}" opacity=".35"/>`,
  },
};

function garlandSvg({ colors, shape }) {
  const sh = SHAPES[shape] || SHAPES.bulb;
  const hooks = [0, 256, 512, 768, 1024], sag = 34, top = 6;
  let path = `M0 ${top}`;
  const items = [];
  for (let i = 0; i < hooks.length - 1; i++) {
    const x0 = hooks[i], x1 = hooks[i + 1], cx = (x0 + x1) / 2;
    path += ` Q${cx} ${top + sag * 2} ${x1} ${top}`;
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * (top + sag * 2) + t * t * top;
      items.push({ x: x.toFixed(1), y: y.toFixed(1), c: colors[items.length % colors.length] });
    }
  }
  const svg = (cls, body) => `<svg class="${cls}" viewBox="0 0 1024 90" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  const at = ({ x, y }, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
  const wire = shape === 'heart' ? '#7a2a4a' : '#2d4a2f';
  return svg('fx-glow a', items.filter((_, i) => i % 2 === 0).map((it) => at(it, sh.glow(it.c))).join(''))
    + svg('fx-glow b', items.filter((_, i) => i % 2 === 1).map((it) => at(it, sh.glow(it.c))).join(''))
    + svg('fx-garland-base', `<path d="${path}" fill="none" stroke="${wire}" stroke-width="3"/>` + items.map((it) => at(it, sh.base(it.c))).join(''));
}

const GROUNDS = {
  snowbank: '<svg viewBox="0 0 1024 70" preserveAspectRatio="none" aria-hidden="true">'
    + '<path d="M0 34 C 90 10, 170 40, 260 26 S 420 6, 520 28 S 700 44, 790 22 S 950 8, 1024 30 L1024 70 L0 70 Z" fill="#dfe9f5"/>'
    + '<path d="M0 44 C 110 24, 200 52, 300 38 S 480 20, 580 40 S 760 54, 860 34 S 980 26, 1024 40 L1024 70 L0 70 Z" fill="#fff"/></svg>',
  fog: '<svg viewBox="0 0 1024 70" preserveAspectRatio="none" aria-hidden="true">'
    + '<path d="M0 30 C 120 6, 220 40, 340 22 S 560 4, 680 26 S 900 46, 1024 20 L1024 70 L0 70 Z" fill="#b9a6e0" opacity=".35"/>'
    + '<path d="M0 44 C 140 24, 260 54, 400 36 S 640 18, 760 40 S 940 54, 1024 36 L1024 70 L0 70 Z" fill="#e4dcf7" opacity=".55"/></svg>',
};
