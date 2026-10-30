# Handoff: Field of Green Prints — iPad Booth Kiosk

## Overview
A single-page kiosk web app that runs full-screen on an iPad (added to the home screen) at a 3D-print vendor booth. Customers tap through to see social/shop QR codes, payment QR codes, maker credits, and a pride-flag guide, and can submit a commission request (with an optional selfie). The artist has hidden gestures for booth signs ("Be right back", "Lunch break", etc.) and a private review step to price a commission before saving it.

## About the Design Files
`design/index.dc.html` is a **working HTML prototype** built in a design tool. It runs on a proprietary runtime (`support.js`, `<x-dc>` template syntax with `{{ }}` holes, `<sc-for>`/`<sc-if>`, `style-active`/`style-before` pseudo-attributes, a `DCLogic` class). **Do not ship it or port that runtime.** Recreate it as a normal static web app.

Recommended target (no existing codebase): **Vite + vanilla JS/TS or a small React app**, deployed as a static site (GitHub Pages / Netlify / Cloudflare Pages). Must work as an iOS home-screen web app. A PWA manifest + service worker for offline use is a welcome upgrade.

## Fidelity
**High-fidelity, and already in production use.** Reproduce visuals, copy, timings and behaviors exactly. All copy in this README and the prototype is final — keep it verbatim.

## Stage & Viewport
- All UI lives in a fixed **1024×768 stage** (iPad landscape, CSS px). Everything is absolutely positioned within it.
- **Browser/desktop:** stage centered on a mint `#9FECC4` page; scaled down uniformly (`min(1, vw/1024, vh/768)`, origin center) if the viewport is smaller. 1px `rgba(0,0,0,0.15)` outline shadow.
- **iOS home-screen (standalone) mode:** html/body/root background `#9FECC4`. Compute the unreachable strip below the document (`screenHeight(landscape-aware) − visualViewport height`, clamped 0–200), scale the stage to `min(vw/1024, (vh−strip)/768)` and translate it down by `strip/2` so the mint frame looks even top/bottom. Re-run on resize, orientationchange, visualViewport resize, load, and at 120/500/1500 ms after mount.
- Global: `user-select:none`, no tap highlight, no callout, images non-draggable with `pointer-events:none`, `overflow:hidden`, viewport `user-scalable=no, viewport-fit=cover`.
- iOS meta: `apple-mobile-web-app-capable=yes`, status bar `black-translucent`, title "Field of Green", `apple-touch-icon.png` (180×180).
- Root `index.html` currently redirects to the app with a cache-busting query (`?v=Date.now()`) and no-cache meta so the iPad never serves a stale build. Keep an equivalent (or use hashed asset filenames + no-cache on index).
- **Build stamp:** tiny label bottom-left (left 10, bottom 8, z 70), `ui-monospace` 11px, color `#4a2f44` opacity 0.22, text `build YYYY-MM-DD<letter> · <feature>`. Used to confirm which version the iPad is running. Keep it (could be injected at build time).

## Screens / Views
All panels are full-stage overlays. Show/hide transition: opacity 0→1, translateY(16px)→0, `280ms ease` (Thank-you and signs: opacity only, 400ms). Hidden panels have `pointer-events:none`.

Every sub-screen has the same **Home pill button** at top 34 / left 36: green `#34D374`, white text 24px/600, padding 14 26 14 20, radius 999, chevron-left icon 26px (stroke 3), 3px border `rgba(0,0,0,0.08)`, shadow `inset 0 -4px 0 rgba(0,0,0,.18), inset 0 3px 0 rgba(255,255,255,.35), 0 6px 0 #1f8a47, 0 10px 18px rgba(31,138,71,.32)`, `button-texture.png` overlay (bg-size 180px, blend overlay). Active: scale(0.95), 120ms.

### 1. Home (welcome + main menu)
- **Wallpaper:** `#FFD9E3` + radial white glow at 20% 90% (0.55, to 40%) + radial green `rgba(52,211,116,.18)` at 80% 10% (to 42%), plus a dot pattern overlay (white 1.5px dots, 40px grid, opacity .55, mix-blend overlay).
- **Floating candy dots** (burn-in guard): 80px mint at left 9%/top 22% (`floaty` 11s), 52px yellow at right 12%/top 20% (`floaty2` 9.5s), 44px lavender at left 16%/bottom 14% (`floaty` 12.5s). Each `radial-gradient(circle at 35% 30%, #fff, <color>)`, opacity .6–.65, soft shadow.
- **Content column** centered, gap 56, padding 40, whole thing on `drift` 34s alternate.
  - Logo `assets/logo.png`, width 800, double drop-shadow.
  - 320px-tall area with two cross-fading layers (320ms):
    - **Welcome layer** (shown until first tap): "Come on in!" in Bagel Fat One 124px, fill `#9FECC4`, 12px stroke `#1f6b3c` (paint-order stroke fill), text-shadow `0 7px 0 #1f6b3c, 0 14px 22px rgba(31,107,60,.3)`, `wiggle` 6s infinite. Below (gap 56): pink pill "Tap for details!" with pointing-hand icon 40px — 38px/700 white, padding 22×48, `#FF6FA3` + texture, 3D shadow ending `0 9px 0 #c14275`, pulsing `tapPulse` 2.2s.
    - **Buttons layer** (after tap; welcome scales to .94 and fades): three round buttons, gap 64. Each: 210px circle with texture + top gloss highlight (`::before` ellipse at top 9%, 26% tall) + 3D bottom shadow; under it (gap 26) a white label pill 32px/700 `#2a1a2e`, padding 14×34.
      - **Information** — `#FFD45B`, ledge `#cba23a`, dark info-"i" icon 82px.
      - **Payment** — `#FF6FA3`, ledge `#c14275`, white QR-grid icon 78px.
      - **Credits** — `#C1A6F2`, ledge `#9575D6`, dark cube icon 82px.
      - Active: scale(0.95), 130ms `cubic-bezier(.3,.7,.4,1)`.
- **Pride button:** 82px white circle bottom-right (30/30), 🏳️‍🌈 44px. Visible only on Home with buttons layer showing and no sign active.

### 2. Information
Background `#FFD9E3` + white radial at 18% 88%. Inner layout: flex, gap 44, padding 98 52 44 56, `drift` 36s.
- **Left column (400px):** title "Let’s stay<br>in touch" (Bagel Fat One 44px `#2a1a2e`, lh 1.02). Body 22px/500 `#4a2f44` opacity .82, max-width 360: "Want to talk more? Feel free to hit me up on Instagram, or check out my selection of products on Etsy!" + blank line + "Tap a button to pull up its QR code, then scan it with your camera."
- Selector buttons (gap 16): **Instagram**, **Etsy** — white cards, radius 22, padding 16×24, 27px/600, with 30px line icons. Selected state = brand color bg, white text, shadow `inset 0 -4px 0 rgba(0,0,0,.18), inset 0 3px 0 rgba(255,255,255,.28), 0 6px 0 <brandDark>, 0 12px 20px rgba(0,0,0,.16)`, translateY(-1px).
- **Request a commission** button (margin-top 8): yellow `#FFD45B` + texture, ledge `#cba23a`, 27px/700, pencil icon → opens Commission form.
- **Right: QR card** centered — white, radius 42, padding 28, gap 18; QR image 404×404 (radius 24); label 30px/700 and sub 20px/500 opacity .7. Card's 16px ledge shadow uses the selected brand's `shadow` color.

### 3. Payment
Same structure as Information (padding 100 52 90 56; left column 420px).
- Title "Easy ways<br>to pay" (46px). Body: "Pick a method, then scan the code with your phone."
- Buttons (gap 14): **Zelle**, **Venmo**, **PayPal** — 30px/600, radius 24, padding 18×26, each with a 44px rounded-square letter badge (Z / V / P, Bagel Fat One, 3px currentColor border).
- Note chip below: translucent white, radius 18, green check icon, 19px: "Cash, card &amp; tap to pay also welcome — just ask!"
- QR card on right as above.

### Brand / QR data
| key | color | dark | ledge shadow | label | sub | url |
|---|---|---|---|---|---|---|
| instagram | #FF6FA3 | #c14275 | rgba(255,111,163,.28) | Instagram | @fieldofgreenprints | https://www.instagram.com/fieldofgreenprints/ |
| etsy | #F1641E | #bd4610 | rgba(241,100,30,.28) | Etsy | fieldofgreenprints.etsy.com | https://fieldofgreenprints.etsy.com |
| zelle | #6D1ED4 | #4e14a0 | rgba(109,30,212,.26) | Zelle | Scan with your banking app | (see `brands` in prototype) |
| venmo | #3D95CE | #2c6f9c | rgba(61,149,206,.28) | Venmo | Scan in the Venmo app | (see prototype) |
| paypal | #003087 | #001d55 | rgba(0,48,135,.26) | PayPal | Scan with your camera or PayPal app | (see prototype) |

Copy the exact Zelle/Venmo/PayPal URLs from `this.brands` in `design/index.dc.html` — they are real payment links.

**QR rendering** (library `qr-code-styling@1.5.0`; bundle it via npm instead of the CDN): 480×480 canvas, margin 6, error correction H, dots rounded `#2a1a2e`, bg `#ffffff`, corner squares extra-rounded `#FF6FA3`, corner dots `dot` `#34D374`. Export PNG data URL. Cache per key in `localStorage['fogp_qr_<key>']`. (Better: pre-generate at build time as static PNGs so the kiosk never depends on the library at runtime.)
Defaults: Information → instagram, Payment → zelle. Selection persists while app is open.

### 4. Credits
Background `#FFD9E3` + lavender radial `rgba(193,166,242,.22)` at 82% 10%.
- Header (padding 98 56 16, centered): "Print credits" (Bagel Fat One 50px), sub 22px opacity .8: "With thanks to the makers behind our prints, including..."
- Scrollable area (padding 8 56 46): 2-column grid, max-width 900, gap 20. Data from **`credits.json`** (fetched no-cache at load; array of `{name, logo, description?}`).
  - Card: white, radius 30, padding 32×24, gap 16, centered.
  - If `logo` is non-empty and not ending in `/`: 150px circular image (object-fit cover), name 31px/700, optional description 21px/500 opacity .75.
  - Otherwise: name only in Bagel Fat One 40px `#1f8a47`, text-wrap balance.
- An unused "Credits page in progress / Ask me for details!" placeholder panel exists (`creditsSoon`); not reachable from UI — can be dropped.

### 5. Pride Flags
Background `#FFF4F8`. Header (padding 34 56 14): "Pride Flags" 46px; sub 21px: "A selection of flags and what they stand for". Scrollable 9-column grid (gap 22 12, padding 10 34 40). Each item: flag image 92×58 (cover, radius 6, shadow), name 15px/700, description 12.5px/500 opacity .75. Footer 15px/600 opacity .7: "More flags in the works — ask if you don't see yours."
Flags (image in `assets/PrideFlags/small/`, name, description) — copy from prototype verbatim; 20 entries, in order: Rainbow, Philadelphia Pride, Progress, Transgender, Bisexual, Lesbian, Pansexual, Asexual, Non-binary, Genderfluid, Genderqueer, Agender, Intersex, Aromantic, Gay Man, Black Trans Pride, Gray-Aromantic, Gray-Asexual, Maverique, Neutrois. Recommend moving these into a `flags.json` like credits.

### 6. Commission flow
**a. Form** (z 20; full-stage pink bg, centered white card max-width 800, radius 38, padding 28 40 26, scroll if needed)
- Title "Commission request" (44px), sub 20px: "Tell me a bit about the piece you have in mind."
- Fields (gap 14), labels 20px/600, inputs radius 16, padding 14×18, 21px Fredoka, 3px border `rgba(0,0,0,.08)`, focus border `#FF6FA3`, user-select enabled:
  - Name — placeholder "Your name"
  - Contact * (pink asterisk) — "Email, phone, or @handle"
  - What would you like? * — textarea 3 rows, no resize — "Describe your commission — subject, style, size, anything helpful."
  - Photo (optional) — yellow "Take a photo" button with camera icon; after capture shows 84px thumbnail + "Remove" button.
- Buttons: **Cancel** (flex 1, white, text `#7a4a5e`) → stops camera, clears draft, returns to Information. **Submit request** (flex 2, pink, ledge `#c14275`).
- Validation: Contact and Request required (trimmed). Invalid field border `#e0416b` and focus first invalid. Reset borders/values each time the form opens.

**b. Camera overlay** (z 35, bg `#1a1016`): front camera (`facingMode:'user'`, no audio, playsinline, muted), video 620px max 84% width, radius 28, mirrored. Controls: Cancel pill, 96px white shutter with 66px pink inner dot, spacer 120px. Capture: draw mirrored to canvas, max width 1000, JPEG quality 0.72 data URL. On getUserMedia failure hide video and show: "Camera unavailable — please allow camera access, or tap Cancel to skip the photo."

**c. Thank you** (z 22): pink radial bg `#FFE4EC → #FFC9DB → #FFB8CE`, floating dots, "Thank you!" Bagel Fat One 104px `#FF6FA3`, sub 32px `#7a4a5e`: "Your request has been received 💚". No visible buttons. **Hidden artist gesture: press-and-hold anywhere 3 s** → Review. Release/leave/cancel aborts.

**d. Review & finalize** (artist only, z 24): white card max-width 820. Title "Review &amp; finalize" 40px; sub "Artist only — add price and notes, then save the request." Read-only summary block (`#FFF4F8`, radius 22): Name / Contact / Request (pre-wrap) / Photo (130px), empty values show "—". Fields: Price (number, min 0, step 0.01, decimal keypad, placeholder 0.00), Notes (textarea, "Private notes for this request"); focus border `#9575D6`. Green "Save &amp; send" button with paper-plane icon.

**e. Send status** (z 26): white card max-width 640, icon 96px, title Bagel 46px, sub 23px, green "Return to main menu" pill → Home (clears draft).
| state | icon | color | title | sub |
|---|---|---|---|---|
| sending | ⏳ | #4a2f44 | Saving… | Sending your request… |
| sent | ✓ | #1f8a47 | Sent! | The request was delivered successfully. |
| queued | ☁ | #c98a1a | Saved — will send when online | There's no connection right now. It will upload automatically once the iPad is back online. |
| local | ✓ | #1f8a47 | Saved on this device | No online destination is set yet, so the request is stored locally as a backup. |

### 7. Booth signs (artist)
- **Signs picker** (z 40): Home-style wallpaper, title "Booth signs" 48px, sub: "Tap a sign to show it. Press &amp; hold the bottom-left corner to come back here." 3-column grid of preview cards (white, radius 30, padding 18; 150px preview, title 24px/700, desc 18px). Home pill here closes signs and goes Home.
- Full-screen signs (z 45), each with floating dots + `drift`:
  - **brb** — pink bg, logo 880px, "Be right back!" 88px pink, "Back at the counter in a moment".
  - **at530** — pink bg, logo 880px, "We’ll be back<br>at 5:30 PM!", "Thanks for your patience 💚".
  - **otherbooth** — yellow bg (`#FFF6E2 → #FFE3A8 → #FFD98C`), logo 780px, "Helping with<br>another booth" 72px `#c07a12`, "If you need anything, look for the guy in the pink cowboy hat!" 32px `#6b5230`.
  - **bulk** — mint bg (`#F2FFF8 → #D6F7E6 → #B7EFD1`), logo 560px, "Got Bulk?" 124px `#2f9c66`, "Don’t just throw them away… I’ll take them off your hands for you!" 36px/600, "Pokémon, One Piece, Lorcana, Magic, doesn’t matter" 30px.
  - **lunch** — pink bg, giant 200px food emoji, "Lunch break!" 112px, "I’ll be right back" 34px. Emoji rotates randomly every 5 s (never repeating consecutively) from the `FOODS` list in the prototype, filtered at startup to emoji the device can render in color as a single glyph (canvas color-pixel test). Picker card preview uses the same live emoji.

## Interactions & Behavior
- **Secret corners** (100×100 stage-px zones, computed in stage coordinates accounting for scale):
  - Hold **top-right + bottom-left** together 0.5 s → toggle signs picker (closed→picker, picker→closed, showing a sign→picker).
  - Hold **bottom-left alone** 0.5 s → hard reset: stop camera, clear draft, go to Home with Welcome showing, close signs.
  - Use `touchstart/touchend/touchcancel` on iPad (multi-finger pointer events get cancelled); pointer events for mouse. Capture phase.
- **Idle reset:** after `idleSeconds` (default 60) of no pointerdown, if on home/info/payment/credits/pride and no sign/camera active → scroll all scroll areas to top, return to Home + Welcome. Otherwise re-arm. Never interrupts the commission flow.
- **Animations** (keyframes, all `alternate infinite` unless noted):
  - `drift` translate(-3,-4) ↔ (3,4) — 30–36s
  - `floaty` translateY 0 ↔ -22px; `floaty2` 0 ↔ 18px
  - `tapPulse` scale 1 → 1.06 → 1, 2.2s ease-in-out
  - `wiggle` rotation blip at 80–100% of 6s (-4°, 4°, -2°)
- Active press on all buttons = scale(0.92–0.98), 120–130ms.

## State
- `screen`: home | info | payment | credits | pride | commission | thanks | review | status
- `entered` (welcome dismissed), `signs`: null | 'picker' | brb | at530 | otherbooth | bulk | lunch
- `infoSel`, `paySel`, `cameraOpen`, `foodIdx`, `credits[]`
- Non-render: `draft {name, contact, request, photo}`, captured photo, media stream, timers.
- Config (were editor tweaks; make them constants/env): `showWelcome` (true), `idleSeconds` (60).

## Data & Persistence
- **Commission backend:** `APPS_SCRIPT_URL` constant — **currently empty**, so the app runs in local-backup mode ("Saved on this device"). When set: POST `FormData` (`name, contact, request, price, notes, photo` [JPEG data URL], `timestamp` ISO) with `mode:'no-cors'`; a resolved fetch counts as sent, a thrown error queues it. Make the URL an env/config value.
- `localStorage` keys (keep identical names so data carries over if the origin stays the same; a new domain starts empty):
  - `fogp_commission_log` — every submission's metadata (photo replaced by "[photo attached]")
  - `fogp_commission_queue` — full records awaiting upload; flushed on load and on `online` event
  - `fogp_qr_<key>` — cached QR PNGs
- Suggested improvement: an artist-only way to export/view the local log (it's currently only readable via devtools).

## Design Tokens
**Colors**
- Mint frame `#9FECC4` · Pink wall `#FFD9E3` · Pride bg / summary `#FFF4F8`
- Ink `#2a1a2e` · Body `#4a2f44` · Muted mauve `#7a4a5e` · Dark green stroke `#1f6b3c`
- Pink `#FF6FA3` / ledge `#c14275` · Yellow `#FFD45B` / `#cba23a` · Green `#34D374` / `#1f8a47` · Lavender `#C1A6F2` / `#9575D6` · Candy lavender `#C8B4F2`
- Error `#e0416b` · Amber `#c98a1a` · Bulk green `#2f9c66`
**Type**
- Display: **Bagel Fat One** (Google Fonts), sizes 124 / 112 / 104 / 88 / 72 / 64 / 50 / 48 / 46 / 44 / 40
- UI: **Fredoka** 400/500/600/700, sizes 38 / 36 / 34 / 32 / 31 / 30 / 27 / 24 / 23 / 22 / 21 / 20 / 19 / 18 / 15 / 12.5
- Self-host both fonts so the kiosk works offline.
**Radii:** 999 (pills), 42 / 40 / 38 (big cards), 30, 24, 22, 20, 18, 16, 13, 6
**Signature "3D candy" button shadow:** `inset 0 -Npx 0 rgba(0,0,0,.12–.18), inset 0 Npx 0 rgba(255,255,255,.35–.5), 0 6–12px 0 <ledgeColor>, 0 10–22px 18–34px <soft tinted shadow>` + 3px `rgba(0,0,0,.08)` border + `button-texture.png` overlay blend.
**Card shadow:** `0 4px 0 rgba(0,0,0,.08), 0 8px 14px rgba(60,20,40,.1)`; big cards add `inset 0 6px 0 rgba(255,255,255,.6), 0 16px 0 <accent @ .22–.28>, 0 30px 44px rgba(60,20,40,.16)`.

## Assets
- `assets/logo.png` — brand logo
- `apple-touch-icon.png` — home-screen icon
- `aesthetic-kit/assets/button-texture.png` — button overlay texture
- `assets/CreditsIcons/*` — maker logos referenced by `credits.json`
- `assets/PrideFlags/small/*` — 20 flag images
- Icons are inline SVG line icons (24px viewBox) in the prototype; copy them or use an equivalent set (e.g. Lucide).

## Files
- `design/index.dc.html` — full prototype (template + logic class at bottom). Source of truth for any detail not above.
- `design/index.html` — cache-busting redirect entry.
- `design/credits.json` — credits data.
- `design/assets/`, `design/aesthetic-kit/assets/button-texture.png`, `design/apple-touch-icon.png`.

## Migration checklist
1. Recreate as a static app; bundle qr-code-styling (or pre-render QRs) and self-host fonts.
2. Move flags and brands into JSON data files alongside `credits.json`.
3. Keep localStorage key names; configure `APPS_SCRIPT_URL` via env.
4. Add the build stamp at build time.
5. Deploy, open on the iPad, Share → Add to Home Screen, verify standalone framing, secret corners, camera permission, and offline behavior.
