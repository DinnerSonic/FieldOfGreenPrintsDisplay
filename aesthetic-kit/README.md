# Bubbly Kit

A portable copy of the visual language from **Field of Green Prints** — a candy /
sticker-book aesthetic. Drop this whole `aesthetic-kit/` folder into any new
project to keep the same look.

## What's here
- `bubbly-kit.css` — the entire reusable style system (palette vars, type scale,
  bubble cards, buttons, chips, press feedback, wallpaper, helpers). Fully
  documented inline.
- `assets/` — the tinted-marble button textures.
- `Style Guide.html` — a visual reference showing every component. Open it to see
  the kit in action.

## Porting to a new project
1. Copy the `aesthetic-kit/` folder into the new project (or copy
   `bubbly-kit.css` + `assets/` to wherever you like — just keep them together,
   since the CSS references `assets/button-texture.png`).
2. In your HTML `<head>`, load the fonts + the kit:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link rel="stylesheet"
     href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Bagel+Fat+One&display=swap">
   <link rel="stylesheet" href="bubbly-kit.css">
   ```
3. Use the classes — `.h1/.h2/.h3/.body`, `.bubble-card`, `.btn` (+ `.primary`
   `.pink` `.ghost` `.lg` `.sm`), `.chip`, `.tap` for press feedback, and the
   layout helpers.

## The recipe (if you rebuild it elsewhere)
The look comes from three moves stacked on every surface:
- a **gloss highlight** (white radial blob near the top),
- **inset shadows** (dark bottom lip + light top edge),
- a **hard drop shadow** in a darker shade of the fill, plus a soft ambient one.

Type is a fat rounded display (**Bagel Fat One**) paired with a rounded UI/body
face (**Fredoka**). Ink is deep plum, never pure black. Sizes are tuned for a
large kiosk canvas — scale font-size and radii down for desktop/mobile; the
recipe is what carries the style, not the exact numbers.
