import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Build stamp shown bottom-left on the kiosk, so you can tell which version the iPad is running.
function buildStamp() {
  const d = new Date();
  const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  let sha = 'local';
  try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
  return `build ${date} · ${sha}`;
}

export default defineConfig({
  // Relative paths so the site works under https://dinnersonic.github.io/FieldOfGreenPrintsDisplay/
  base: './',
  define: { __BUILD_STAMP__: JSON.stringify(buildStamp()) },
  build: {
    rollupOptions: {
      // The kiosk, the page customers open on their phone from the kiosk's QR code, and the
      // remote control for the artist's computer.
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        upload: fileURLToPath(new URL('upload.html', import.meta.url)),
        control: fileURLToPath(new URL('control.html', import.meta.url)),
      },
    },
  },
});
