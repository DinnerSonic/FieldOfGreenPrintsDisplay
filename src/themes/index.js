// Theme list + the artist's choice (remembered on this iPad).
//
// Each seasonal theme lives in its own folder and is only downloaded when it's selected
// (`load` is a dynamic import, which the build splits into a separate file). Classic is the
// base look in src/styles.css and needs nothing extra. See runtime.js for how a theme's
// decorations are shown.

export const THEMES = [
  { id: 'classic', label: 'Classic', swatch: 'radial-gradient(circle at 50% 30%, #FFE4EC 0, #FFB8CE 100%)' },
  {
    id: 'halloween', label: 'Halloween', months: [9], // October
    swatch: 'radial-gradient(circle at 50% 40%, #4a2475 0, #1a0b2e 100%)',
    load: () => import('./halloween/index.js'),
  },
  {
    id: 'holiday', label: 'Holiday', months: [10, 11], // November, December
    swatch: 'radial-gradient(circle at 50% 40%, #d7263d 0, #7d0a1c 100%)',
    load: () => import('./holiday/index.js'),
  },
  {
    id: 'valentines', label: 'Valentine’s', months: [1], // February
    swatch: 'radial-gradient(circle at 50% 40%, #e0457b 0, #7a0f3a 100%)',
    load: () => import('./valentines/index.js'),
  },
];

// The Theme card cycles through these.
export const SETTINGS = ['classic', 'auto', ...THEMES.filter((t) => t.id !== 'classic').map((t) => t.id)];

const KEY = 'fogp_theme';
export function themeSetting() {
  try { const v = localStorage.getItem(KEY); return SETTINGS.includes(v) ? v : 'classic'; } catch (e) { return 'classic'; }
}
export function setThemeSetting(v) {
  try { localStorage.setItem(KEY, v); } catch (e) {}
}

/** The theme to show right now: the chosen one, or in Auto, whichever covers this month. */
export function activeThemeId(date = new Date()) {
  const s = themeSetting();
  if (s !== 'auto') return s;
  const t = THEMES.find((x) => x.months && x.months.includes(date.getMonth()));
  return t ? t.id : 'classic';
}

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const settingLabel = (s) => (s === 'auto' ? 'Auto' : themeById(s).label);
