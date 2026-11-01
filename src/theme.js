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

// A string of lights sagging between hooks across the top of a screen.
function lightsSvg() {
  const W = 1024, hooks = [0, 256, 512, 768, 1024], sag = 34, top = 6;
  let path = `M0 ${top}`;
  const bulbs = [];
  for (let i = 0; i < hooks.length - 1; i++) {
    const x0 = hooks[i], x1 = hooks[i + 1], cx = (x0 + x1) / 2;
    path += ` Q${cx} ${top + sag * 2} ${x1} ${top}`;
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * (top + sag * 2) + t * t * top;
      bulbs.push([x, y]);
    }
  }
  const bulbEls = bulbs.map(([x, y], i) => {
    const c = BULB_COLORS[i % BULB_COLORS.length];
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">`
      + `<rect x="-3.5" y="-1" width="7" height="7" rx="1.5" fill="#2d4a2f"/>`
      + `<ellipse class="bulb" cx="0" cy="15" rx="7" ry="10" fill="${c}" style="--glow:${c}; animation-delay:${(-(i * 0.37) % 2.4).toFixed(2)}s"/>`
      + `<ellipse cx="-2.2" cy="11" rx="2" ry="3.2" fill="#fff" opacity=".55"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 1024 90" preserveAspectRatio="none" aria-hidden="true">`
    + `<path d="${path}" fill="none" stroke="#2d4a2f" stroke-width="3"/>${bulbEls}</svg>`;
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
// Light enough for an older iPad: ~30 fps, no blur, and it only runs while visible.
export function createSnow(canvas) {
  const ctx = canvas.getContext('2d');
  let flakes = [];
  let running = false;
  let raf = 0;
  let last = 0;

  const newFlake = (anywhere) => ({
    x: Math.random() * canvas.width,
    y: anywhere ? Math.random() * canvas.height : -8,
    r: 2 + Math.random() * 4,
    vy: 22 + Math.random() * 48,
    vx: -8 + Math.random() * 16,
    sway: Math.random() * Math.PI * 2,
    a: 0.75 + Math.random() * 0.25,
  });

  function fit() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (w && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w; canvas.height = h;
      flakes = Array.from({ length: 140 }, () => newFlake(true));
    }
  }

  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (last && t - last < 33) return;
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0.033;
    last = t;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.sway += dt * 1.3;
      f.y += f.vy * dt;
      f.x += f.vx * dt + Math.sin(f.sway) * 0.5;
      if (f.y > h + 8) Object.assign(f, newFlake(false));
      if (f.x < -8) f.x = w + 8; else if (f.x > w + 8) f.x = -8;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.a})`;
      ctx.fill();
      // A faint edge keeps flakes visible over light backgrounds too.
      ctx.strokeStyle = 'rgba(120,150,190,.28)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  return {
    set(on) {
      if (on === running) return;
      running = on;
      canvas.classList.toggle('on', on);
      if (on) { fit(); last = 0; raf = requestAnimationFrame(frame); }
      else cancelAnimationFrame(raf);
    },
    fit,
  };
}
