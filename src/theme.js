// Seasonal theme. Classic by default; "auto" switches to the holiday look for November and
// December. The artist picks one from the booth signs screen (remembered on this iPad).
// Holiday styling lives in theme.css under [data-theme="holiday"].

const KEY = 'fogp_theme';
export const THEME_SETTINGS = ['classic', 'holiday', 'auto'];

export function themeSetting() {
  try { const v = localStorage.getItem(KEY); return THEME_SETTINGS.includes(v) ? v : 'classic'; } catch (e) { return 'classic'; }
}
export function setThemeSetting(v) {
  try { localStorage.setItem(KEY, v); } catch (e) {}
}
export const holidaySeason = (d = new Date()) => d.getMonth() === 10 || d.getMonth() === 11; // Nov, Dec
export function activeTheme() {
  const s = themeSetting();
  return s === 'auto' ? (holidaySeason() ? 'holiday' : 'classic') : s;
}

// ─────────── Decorations (only visible in the holiday theme) ───────────

const BULB_COLORS = ['#ff3b4e', '#ffd23f', '#39d97a', '#4fb3ff', '#FF6FA3'];

// A string of lights sagging between hooks across the top of a screen. The bulbs are static;
// the twinkle is two pre-drawn glow layers (alternate bulbs) whose opacity CSS fades in turn,
// which the iPad's graphics chip handles almost for free (no per-frame filters or redraws).
function lightsSvg() {
  const hooks = [0, 256, 512, 768, 1024], sag = 34, top = 6;
  let path = `M0 ${top}`;
  const bulbs = [];
  for (let i = 0; i < hooks.length - 1; i++) {
    const x0 = hooks[i], x1 = hooks[i + 1], cx = (x0 + x1) / 2;
    path += ` Q${cx} ${top + sag * 2} ${x1} ${top}`;
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * (top + sag * 2) + t * t * top;
      bulbs.push({ x: x.toFixed(1), y: y.toFixed(1), c: BULB_COLORS[bulbs.length % BULB_COLORS.length] });
    }
  }
  const svg = (cls, body) => `<svg class="${cls}" viewBox="0 0 1024 90" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  const base = `<path d="${path}" fill="none" stroke="#2d4a2f" stroke-width="3"/>` + bulbs.map(({ x, y, c }) =>
    `<g transform="translate(${x} ${y})"><rect x="-3.5" y="-1" width="7" height="7" rx="1.5" fill="#2d4a2f"/>`
    + `<ellipse cx="0" cy="15" rx="7" ry="10" fill="${c}"/>`
    + `<ellipse cx="-2.2" cy="11" rx="2" ry="3.2" fill="#fff" opacity=".55"/></g>`).join('');
  const glow = (odd) => bulbs.filter((_, i) => i % 2 === odd).map(({ x, y, c }) =>
    `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="15" rx="16" ry="20" fill="${c}" opacity=".22"/>`
    + `<ellipse cx="0" cy="15" rx="10" ry="13" fill="${c}" opacity=".35"/>`
    + `<ellipse cx="0" cy="15" rx="5" ry="7" fill="#fff" opacity=".45"/></g>`).join('');
  return svg('l-glow a', glow(0)) + svg('l-glow b', glow(1)) + svg('l-base', base);
}

function snowbankSvg() {
  return '<svg viewBox="0 0 1024 70" preserveAspectRatio="none" aria-hidden="true">'
    + '<path d="M0 34 C 90 10, 170 40, 260 26 S 420 6, 520 28 S 700 44, 790 22 S 950 8, 1024 30 L1024 70 L0 70 Z" fill="#dfe9f5"/>'
    + '<path d="M0 44 C 110 24, 200 52, 300 38 S 480 20, 580 40 S 760 54, 860 34 S 980 26, 1024 40 L1024 70 L0 70 Z" fill="#fff"/>'
    + '</svg>';
}

/** Adds the lights + snowbank to each decorated screen (hidden by CSS unless holiday). */
export function addDecorations(stage) {
  const deco = () => {
    const d = document.createElement('div');
    d.className = 'holiday-deco';
    d.innerHTML = `<div class="lights">${lightsSvg()}</div><div class="snowbank">${snowbankSvg()}</div>`;
    return d;
  };
  stage.querySelector('.wall').after(deco()); // home: above the wallpaper, below the content
  for (const sel of ['[data-sign="brb"]', '[data-sign="at530"]', '[data-sign="lunch"]', '#thanks']) {
    const panel = stage.querySelector(sel);
    if (panel) panel.prepend(deco());
  }
}

// ─────────── Snow ───────────
// Three layers of pre-drawn flakes (small/fast-ish, medium, large/slow) slid downward by CSS
// transform animations, like the pulsing button: cheap for an older iPad. Paused when hidden.
export function createSnow(el) {
  el.innerHTML = '<div class="snow-layer s1"></div><div class="snow-layer s2"></div><div class="snow-layer s3"></div>';
  let on = false;
  return {
    set(next) {
      if (next === on) return;
      on = next;
      el.classList.toggle('on', on);
    },
    fit() {},
  };
}
