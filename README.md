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
| "From your phone" photos: kiosk side + shared API | `src/main.js`, `src/phone.js` |
| Seasonal themes (list, Auto months, runtime) | `src/themes/index.js`, `src/themes/runtime.js` |
| Each theme's colours + decorations | `src/themes/<name>/` (`holiday`, `halloween`, `valentines`) |
| Phone page customers open from the QR code | `upload.html`, `src/upload.js`, `src/upload.css` |
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

Photos: **From your phone** shows a QR code; the customer's phone opens `upload.html` and sends
full-size photos straight to the Apps Script, and the kiosk shows small previews as they
arrive. **Selfie** uses the iPad's front camera. Both end up in the request's Drive folder.
Phone photos need internet on both the phone and the iPad.

If the iPad is offline, requests wait on the iPad and upload automatically later. The build
stamp in the bottom-left shows `· N waiting to upload` while anything is pending. The iPad keeps
a backup copy of each request for 14 days after it uploads (`KEEP_SENT_DAYS` in `src/config.js`),
then deletes it; requests that haven’t uploaded yet are never deleted.

## Hidden gestures

- Hold **top-right + bottom-left** corners together 0.5 s → booth signs picker. At the end of it,
  **Saved requests**, lists the requests stored on the iPad, with a two-tap Delete on each.
  **Theme** cycles Classic (the default), Auto (Halloween in October, Holiday in November and
  December, Valentine's in February), Halloween, Holiday and Valentine's.
- Hold **bottom-left** alone 0.5 s → reset to the welcome screen.
- Hold **top-left** alone 1.5 s → performance log panel (Start logging, Copy log). While logging,
  tap the `LOG` badge whenever you see lag. Holding the corner again reopens the panel, where you
  can stop logging or switch effects off one at a time (snow, lights, floating motion) to compare
  frame rates; effects come back on when the app restarts. Logs stop themselves after 30 minutes
  and the latest one is kept on the iPad until the next one replaces it.
  **Auto test** (2.5 min) runs a log by itself: home, Be right back, home again, 10 s each, with
  everything on and then with each effect off, and puts a results table at the top of the log.

## Seasonal themes

Each theme lives in `src/themes/<name>/` (its CSS plus a small config: garland, ground,
falling/rising particles, bottom-strip colours) and is listed in `src/themes/index.js` with
the months Auto uses it. Only the selected theme is downloaded. There is only ever one set of
decorations, moved onto whichever screen is showing, so hidden screens hold no decoration
layers and run no decoration animations.
