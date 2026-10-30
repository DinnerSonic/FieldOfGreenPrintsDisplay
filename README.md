# Field of Green Prints — iPad booth kiosk

A single-page kiosk that runs full-screen on an iPad (Share → Add to Home Screen) at the booth.
Built with [Vite](https://vite.dev) + plain JavaScript; deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to the default branch.

## Working on it

```bash
npm install
npm run dev      # http://localhost:5173 (also reachable from the iPad on the same Wi-Fi)
npm run build    # production build into dist/
```

## Where things live

| What | File |
|---|---|
| Screens / markup | `index.html` |
| Styles | `src/styles.css` |
| Behaviour (navigation, secret corners, idle reset, camera, signs) | `src/main.js` |
| Commission storage + upload | `src/commissions.js` |
| Settings (backend URL, idle time, photo size) | `src/config.js` |
| Instagram / Etsy / payment links | `src/data/brands.json` |
| Pride flags | `src/data/flags.json` + `public/assets/PrideFlags/small/` |
| Print credits | `public/credits.json` + `public/assets/CreditsIcons/` |
| Commission backend (Google Apps Script) | `apps-script/` — see its README |
| Original design handoff + prototype | `docs/` |

`public/index.dc.html` redirects to the app, so a home-screen icon saved from the old
prototype URL keeps working.

## Commissions

When a customer taps **Submit request**, the request (and selfie, if taken) is saved on the
iPad (IndexedDB) and sent straight to the Apps Script in `apps-script/`, which files it in
Google Drive and adds a row to the "Commission log" sheet. "Thank you!" shows for 3 seconds,
then the kiosk goes back to the welcome screen. Price, status and notes are handled in the sheet.

If the iPad is offline, requests wait on the iPad and upload automatically later. The build
stamp in the bottom-left shows `· N waiting to upload` while anything is pending.

## Hidden gestures

- Hold **top-right + bottom-left** corners together 0.5 s → booth signs picker.
- Hold **bottom-left** alone 0.5 s → reset to the welcome screen.
