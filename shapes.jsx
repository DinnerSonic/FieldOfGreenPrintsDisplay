// shapes.jsx — SVG silhouettes for menu cards
//
// Each entry defines either:
//   - { type:'css', radius:'...' }   → uses .bubble-card with border-radius
//   - { type:'svg', viewBox, path }  → renders a stretched SVG silhouette
//     The bounding rectangle still tappable, but the visible fill follows the path.
//     Drop shadow uses CSS `filter` so it traces the path edge.
//
// Paths designed in a 100×150 viewBox (portrait 2:3) and stretched with
// preserveAspectRatio="none" so they look right on any card aspect.

const SHAPES = {
  squircle: { type: 'css', label: 'Squircle', radius: '52px' },

  blob:     { type: 'css', label: 'Blob',
              radius: '60% 50% 55% 65% / 55% 65% 50% 55%' },

  sticker:  { type: 'svg', label: 'Sticker',
              viewBox: '0 0 100 150',
              path: 'M 8 18 C 0 6, 18 -2, 34 4 C 50 -4, 72 0, 90 6 C 102 14, 96 30, 96 50 C 102 72, 98 96, 96 120 C 96 142, 78 152, 58 148 C 38 152, 14 152, 6 138 C -2 118, 6 96, 2 76 C -4 56, -2 30, 8 18 Z' },

  flower:   { type: 'svg', label: 'Flower',
              viewBox: '0 0 100 150',
              // 8-petal cookie shape: 3 bumps on each long edge, 2 on each short edge
              path: 'M 50 0 C 60 0 66 6 68 14 C 80 8 90 14 88 26 C 96 28 100 38 94 48 C 102 60 102 72 94 80 C 102 90 96 102 88 100 C 90 116 80 124 68 118 C 66 132 56 134 50 128 C 44 134 34 132 32 118 C 20 124 10 116 12 100 C 4 102 -2 90 6 80 C -2 72 -2 60 6 48 C 0 38 4 28 12 26 C 10 14 20 8 32 14 C 34 6 40 0 50 0 Z' },

  burst:    { type: 'svg', label: 'Burst',
              viewBox: '-4 -4 108 158',
              // 12-point gentle starburst
              path: (function () {
                const cx = 50, cy = 75, n = 14;
                const ro = 56, ri = 46; // outer, inner radii
                const ry_out = 84, ry_in = 70;
                let d = '';
                for (let i = 0; i < n * 2; i++) {
                  const ang = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
                  const isOut = i % 2 === 0;
                  const rx = isOut ? ro : ri;
                  const ry = isOut ? ry_out : ry_in;
                  const x = cx + Math.cos(ang) * rx;
                  const y = cy + Math.sin(ang) * ry;
                  d += (i === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
                }
                // smooth corners: replace L with Q via small offset — skip for now
                return d + 'Z';
              })() },

  badge:    { type: 'svg', label: 'Badge',
              viewBox: '0 0 100 150',
              path: 'M 50 2 Q 76 -2 90 8 Q 100 22 96 52 Q 98 84 84 116 Q 70 138 54 146 Q 50 150 46 146 Q 30 138 16 116 Q 2 84 4 52 Q 0 22 10 8 Q 24 -2 50 2 Z' },

  scallop:  { type: 'svg', label: 'Scallop',
              viewBox: '0 0 100 150',
              // Pre-computed scallop: 6 bumps top/bottom, 9 bumps each side
              path: (function () {
                const w = 100, h = 150;
                const sx = 8.33, sy = 8.33; // ~6 segments wide, ~9 segments tall
                const cols = Math.round(w / sx);
                const rows = Math.round(h / sy);
                const cw = w / cols, ch = h / rows;
                const parts = [`M 0 ${(ch / 2).toFixed(2)}`];
                // top edge (left → right)
                for (let i = 0; i < cols; i++) {
                  const x = (i + 1) * cw;
                  parts.push(`A ${(cw / 2).toFixed(2)} ${(cw / 2).toFixed(2)} 0 0 1 ${x.toFixed(2)} ${(ch / 2).toFixed(2)}`);
                }
                // right edge (top → bottom)
                for (let i = 0; i < rows; i++) {
                  const y = (i + 1) * ch;
                  parts.push(`A ${(ch / 2).toFixed(2)} ${(ch / 2).toFixed(2)} 0 0 1 ${(w - ch / 2).toFixed(2)} ${y.toFixed(2)}`);
                }
                // bottom edge (right → left)
                for (let i = 0; i < cols; i++) {
                  const x = w - (i + 1) * cw;
                  parts.push(`A ${(cw / 2).toFixed(2)} ${(cw / 2).toFixed(2)} 0 0 1 ${x.toFixed(2)} ${(h - ch / 2).toFixed(2)}`);
                }
                // left edge (bottom → top)
                for (let i = 0; i < rows; i++) {
                  const y = h - (i + 1) * ch;
                  parts.push(`A ${(ch / 2).toFixed(2)} ${(ch / 2).toFixed(2)} 0 0 1 ${(ch / 2).toFixed(2)} ${y.toFixed(2)}`);
                }
                parts.push('Z');
                return parts.join(' ');
              })() },
};

// ─── Mask helper ──────────────────────────────────────────────────────────
// Returns CSS style props to clip a container to the silhouette shape.
// Use on a <Tap> so its children + ripples are visually contained to the
// surface — not bleeding into the drop shadow, outline, or transparent
// areas around an irregular SVG silhouette.
function maskStylesFor(shape) {
  const def = SHAPES[shape] || SHAPES.squircle;
  if (def.type === 'css') {
    // border-radius + the .tap class's `overflow: hidden` is enough.
    return { borderRadius: def.radius };
  }
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + def.viewBox +
    '" preserveAspectRatio="none"><path d="' + def.path + '" fill="white"/></svg>';
  const url = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  return {
    WebkitMaskImage: url, maskImage: url,
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
  };
}

// ─── ShapedShadow ─────────────────────────────────────────────────────────
// The drop shadow + outline layer — rendered BEHIND the Tap so it survives
// the mask. Outline is a stroke that traces the silhouette path.
function ShapedShadow({ shape, shadowColor }) {
  const def = SHAPES[shape] || SHAPES.squircle;

  if (def.type === 'css') {
    return (
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        borderRadius: def.radius,
        background: shadowColor,
        transform: 'translateY(12px)',
        filter: 'drop-shadow(0 10px 22px rgba(60,20,40,0.22))',
        boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.18)',
        pointerEvents: 'none',
      }} />
    );
  }

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
    }}>
      {/* Chunky offset silhouette: filled with shadowColor and pushed
          14px down so it peeks out below the masked surface. Soft
          ambient drop-shadow is layered on via filter. */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: 'translateY(14px)',
        filter: 'drop-shadow(0 10px 22px rgba(60,20,40,0.22))',
      }}>
        <svg viewBox={def.viewBox} preserveAspectRatio="none"
             width="100%" height="100%"
             style={{ display: 'block', overflow: 'visible' }}>
          <path d={def.path} fill={shadowColor} />
        </svg>
      </div>
      {/* Thick outline that traces the silhouette path. Stays visible
          OUTSIDE the masked surface so the button reads as having depth. */}
      <svg viewBox={def.viewBox} preserveAspectRatio="none"
           width="100%" height="100%"
           style={{ display: 'block', position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={def.path} fill="none"
              stroke="rgba(0,0,0,0.22)" strokeWidth="3.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── ShapedFill ───────────────────────────────────────────────────────────
// The colored surface + gloss — rendered INSIDE the masked Tap. Since the
// Tap itself is clipped to the silhouette via CSS mask, this fill can be
// a plain rectangle — the mask reshapes it.
function ShapedFill({ color }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0,
      backgroundColor: color,
      backgroundImage: 'var(--btn-tex)',
      backgroundSize: '300px',
      backgroundPosition: 'center',
      backgroundBlendMode: 'overlay',
      pointerEvents: 'none',
    }}>
      {/* Glossy top highlight */}
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: '6%', height: '22%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 70%)',
      }} />
      {/* Soft bottom darkening for volume */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.10), transparent)',
      }} />
    </div>
  );
}

// ─── ShapedBg (legacy, single-layer) ──────────────────────────────────────
// Kept for backwards compatibility — renders shadow + fill in one pass,
// without a mask. Prefer ShapedShadow + ShapedFill + maskStylesFor when
// you want content clipped to the silhouette.
function ShapedBg({ shape, color, shadowColor, style }) {
  const def = SHAPES[shape] || SHAPES.squircle;

  if (def.type === 'css') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: color,
          borderRadius: def.radius,
          border: '3px solid rgba(0,0,0,0.08)',
          boxShadow:
            'inset 0 -8px 0 rgba(0,0,0,0.10),' +
            ' inset 0 6px 0 rgba(255,255,255,0.45),' +
            ' 0 12px 0 ' + shadowColor + ',' +
            ' 0 22px 36px rgba(60, 20, 40, 0.18)',
          ...style,
        }}
      >
        <div style={{
          position: 'absolute', left: '8%', right: '8%', top: '6%', height: '22%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }} />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        filter:
          'drop-shadow(0 14px 0 ' + shadowColor + ')' +
          ' drop-shadow(0 22px 22px rgba(60,20,40,0.22))',
        ...style,
      }}
    >
      <svg
        viewBox={def.viewBox}
        preserveAspectRatio="none"
        width="100%" height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={'gloss-' + shape} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="white" stopOpacity="0.55" />
            <stop offset="22%" stopColor="white" stopOpacity="0.15" />
            <stop offset="55%" stopColor="white" stopOpacity="0" />
            <stop offset="92%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path d={def.path} fill={color} />
        <path d={def.path} fill={'url(#gloss-' + shape + ')'} />
        <path d={def.path} fill="none"
              stroke="rgba(0,0,0,0.10)" strokeWidth="0.9"
              vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

// ─── ShapedCard ───────────────────────────────────────────────────────────
// The full main-menu button treatment, reusable on any screen: a press
// wrapper that carries scale/peel/wobble, a ShapedShadow behind it, and a
// silhouette-masked Tap surface (ShapedFill + gloss) with arbitrary children
// laid on top. Pair it with useSkirtField so the risen-liquid skirt traces
// the same silhouette in the Mercury background.
function ShapedCard({
  shape, color, shadow, lip = true,
  ripple, wobble, peel, onTap, cardRef,
  style, contentStyle, className = '', children,
}) {
  return (
    <div className={'card-press' + (peel ? ' peel' : '') + (className ? ' ' + className : '')}
         ref={cardRef} style={style}>
      {lip !== false && <ShapedShadow shape={shape} shadowColor={shadow} />}
      <Tap
        ripple={ripple}
        wobble={wobble}
        peel={peel}
        onTap={onTap}
        style={{
          ...maskStylesFor(shape),
          position: 'relative',
          flex: 1,
          minWidth: 0,
          ...contentStyle,
        }}
      >
        <ShapedFill color={color} />
        {children}
      </Tap>
    </div>
  );
}

// ─── Shared skirt compositor ────────────────────────────────────────────────
// Every on-screen menu feeds its shaped cards into ONE Mercury "card field".
// A single global render loop composites all registered sources each frame, so
// screens never fight over the field and the skirt never blanks out mid-nav.
//
// Crossfade: a source whose .screen ancestor is animating OUT (class
// `screen-exit`) ramps its skirt-spread factor toward 0; the entering screen
// holds at its full spread — so the old menu's skirt recedes to nothing while
// the new menu's skirt arrives at its proper value, in step with the screen
// transition.
const SKIRT_FS = 0.6;          // field-texture resolution scale (soft -> cheap)
const SKIRT_FADE_MS = 360;     // time for an exiting menu's skirt to reach 0
const _skirtSources = new Set();
let _skirtRaf = 0, _skirtLast = 0, _skirtSig = '';
let _skirtField = null, _skirtFctx = null, _skirtFW = 0, _skirtFH = 0;

// Recolor a white-on-transparent mask to a solid color.
function _skRecolor(mask, color) {
  const c = document.createElement('canvas');
  c.width = mask.width; c.height = mask.height;
  const x = c.getContext('2d');
  x.drawImage(mask, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// Turn a silhouette mask into a ridge sprite: a blurred white halo around its
// edge with the interior knocked back to black on an opaque black field — so
// it stamps additively ('lighter').
function _skRidge(mask, blur) {
  const c = document.createElement('canvas');
  c.width = mask.width; c.height = mask.height;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'lighter';
  x.filter = blur > 0.1 ? `blur(${blur}px)` : 'none';
  x.drawImage(mask, 0, 0);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-over';
  x.drawImage(_skRecolor(mask, '#000'), 0, 0);
  return c;
}
// Recolor an image's ALPHA into a solid silhouette of `color`.
function _skSilhouette(img, sw, sh, dx, dy, dw, dh, color) {
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const x = c.getContext('2d');
  x.drawImage(img, dx, dy, dw, dh);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, sw, sh);
  return c;
}
// Fill a card silhouette into ctx, stretched to the given rect.
function _skFillSilhouette(ctx, shp, x0, y0, wRect, hRect, SHAPES) {
  const def = SHAPES[shp] || SHAPES.squircle;
  ctx.save();
  if (def.type === 'svg') {
    const vb = def.viewBox.trim().split(/[\s,]+/).map(Number);
    ctx.translate(x0, y0);
    ctx.scale(wRect / vb[2], hRect / vb[3]);
    ctx.translate(-vb[0], -vb[1]);
    ctx.fill(new Path2D(def.path));
  } else {
    const r = Math.min(wRect, hRect) * 0.34;
    const x1 = x0 + wRect, y1 = y0 + hRect;
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x1, y0, x1, y1, r);
    ctx.arcTo(x1, y1, x0, y1, r);
    ctx.arcTo(x0, y1, x0, y0, r);
    ctx.arcTo(x0, y0, x1, y0, r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
// Bake a card ridge sprite at a rest footprint + blur. → { sprite, pad, fw, fh }
function _skBuildSprite(shp, fw, fh, blur, SHAPES) {
  const pad = Math.ceil(blur * 2.4 + 2);
  const sw = Math.ceil(fw + pad * 2), sh = Math.ceil(fh + pad * 2);
  const mask = document.createElement('canvas');
  mask.width = sw; mask.height = sh;
  const mx = mask.getContext('2d');
  mx.fillStyle = '#fff';
  _skFillSilhouette(mx, shp, pad, pad, fw, fh, SHAPES);
  return { sprite: _skRidge(mask, blur), pad, fw, fh };
}
// Bake a logo ridge sprite from its PNG alpha. → { sprite, pad, fw, fh }
function _skBuildLogoSprite(img, fw, fh, blur) {
  const pad = Math.ceil(blur * 2.4 + 2);
  const sw = Math.ceil(fw + pad * 2), sh = Math.ceil(fh + pad * 2);
  const mask = _skSilhouette(img, sw, sh, pad, pad, fw, fh, '#fff');
  return { sprite: _skRidge(mask, blur), pad, fw, fh };
}

function _skirtLoop(ts) {
  _skirtRaf = requestAnimationFrame(_skirtLoop);
  const dt = _skirtLast ? Math.min(64, ts - _skirtLast) : 16;
  _skirtLast = ts;

  const canvas = document.querySelector('.mercury-bg');
  const handle = canvas && canvas.__mercury;
  if (!handle || !handle.setCardField) return;

  if (_skirtSources.size === 0) {
    // No menu on screen — clear the field once, but keep the loop alive so it
    // resumes instantly when the next menu registers (a brief empty frame can
    // occur as one screen unmounts and the next mounts during a transition).
    if (_skirtSig !== '') { _skirtSig = ''; handle.setCardField(null); }
    return;
  }

  const SHAPES = window.SHAPES || {};
  const w = Math.round(canvas.clientWidth || 1);
  const h = Math.round(canvas.clientHeight || 1);
  const r = canvas.getBoundingClientRect();

  if (!_skirtField || _skirtFW !== w || _skirtFH !== h) {
    _skirtField = document.createElement('canvas');
    _skirtField.width = Math.max(1, Math.round(w * SKIRT_FS));
    _skirtField.height = Math.max(1, Math.round(h * SKIRT_FS));
    _skirtFctx = _skirtField.getContext('2d');
    _skirtFW = w; _skirtFH = h; _skirtSig = '';
  }

  const toLocal = (cr) => ({
    x: (cr.left - r.left) / Math.max(1, r.width) * w,
    y: (cr.top - r.top) / Math.max(1, r.height) * h,
    w: cr.width / Math.max(1, r.width) * w,
    h: cr.height / Math.max(1, r.height) * h,
  });

  const draws = [];          // { sp:{sprite,pad,fw,fh}, boxes:[...] }
  let sig = w + 'x' + h;
  let anyVisible = false;

  for (const src of _skirtSources) {
    const els = (src.cardRefs.current || []).filter(Boolean);
    const logoEl0 = src.logoRef && src.logoRef.current;
    // A source needs at least cards OR a logo to contribute.
    const primary = els[0] || logoEl0;
    if (!primary) continue;

    // Ramp the spread factor: exiting screens drop toward 0, others rise to 1.
    const screenEl = primary.closest('.screen');
    const exiting = !!(screenEl && screenEl.classList.contains('screen-exit'));
    const target = exiting ? 0 : 1;
    if (src.factor === undefined) src.factor = 1;   // enter at full spread
    const step = dt / SKIRT_FADE_MS;
    if (src.factor < target) src.factor = Math.min(target, src.factor + step);
    else if (src.factor > target) src.factor = Math.max(target, src.factor - step);

    if (src.factor <= 0.002) continue;              // fully receded — skip

    // Cards (optional): bake the silhouette sprite at the rest footprint.
    if (els.length) {
      const fw = els[0].offsetWidth, fh = els[0].offsetHeight;
      if (fw > 0 && fh > 0) {
        anyVisible = true;
        const cardBlur = Math.max(0, src.cardSpread) * src.factor;
        const ck = src.shape + '|' + fw + 'x' + fh + '|' + (Math.round(cardBlur * 4) / 4);
        if (src._ck !== ck) { src._cSprite = _skBuildSprite(src.shape, fw, fh, cardBlur, SHAPES); src._ck = ck; }
        const boxes = els.map((el) => toLocal(el.getBoundingClientRect()));
        draws.push({ sp: src._cSprite, boxes });
        sig += '|C' + ck + boxes.map((b) =>
          b.x.toFixed(1) + ',' + b.y.toFixed(1) + ',' + b.w.toFixed(1) + ',' + b.h.toFixed(1)).join(';');
      }
    }

    // Optional logo skirt, driven by the same factor.
    const logoEl = logoEl0;
    const logoBlur = Math.max(0, src.logoSpread) * src.factor;
    if (logoEl && logoEl.complete && logoEl.naturalWidth > 0 && logoBlur > 0.05) {
      const lw = logoEl.offsetWidth, lh = logoEl.offsetHeight;
      if (lw > 0 && lh > 0) {
        anyVisible = true;
        const lk = 'L|' + lw + 'x' + lh + '|' + (Math.round(logoBlur * 4) / 4);
        if (src._lk !== lk) { src._lSprite = _skBuildLogoSprite(logoEl, lw, lh, logoBlur); src._lk = lk; }
        const lb = toLocal(logoEl.getBoundingClientRect());
        draws.push({ sp: src._lSprite, boxes: [lb] });
        sig += '|' + lk + lb.x.toFixed(1) + ',' + lb.y.toFixed(1) + ',' + lb.w.toFixed(1) + ',' + lb.h.toFixed(1);
      }
    }
  }

  if (sig === _skirtSig) return;   // nothing moved — keep last upload
  _skirtSig = sig;

  const fx = _skirtFctx;
  fx.setTransform(SKIRT_FS, 0, 0, SKIRT_FS, 0, 0);
  fx.globalCompositeOperation = 'source-over';
  fx.fillStyle = '#000';
  fx.fillRect(0, 0, w, h);
  fx.globalCompositeOperation = 'lighter';
  for (const d of draws) {
    const { sprite, pad, fw, fh } = d.sp;
    for (const b of d.boxes) {
      const sx = b.w / fw, sy = b.h / fh;
      fx.drawImage(sprite, b.x - pad * sx, b.y - pad * sy, (fw + pad * 2) * sx, (fh + pad * 2) * sy);
    }
  }
  fx.globalCompositeOperation = 'source-over';
  handle.setCardField(anyVisible ? _skirtField : null);
}

function _skirtStart() {
  _skirtSig = '';                 // force a recompute after registry changes
  if (!_skirtRaf) { _skirtLast = 0; _skirtRaf = requestAnimationFrame(_skirtLoop); }
}

// ─── useSkirtField ──────────────────────────────────────────────────────────
// Registers a set of shaped cards (and an optional logo) as a source for the
// shared skirt compositor above. While the screen is on top its skirt sits at
// full spread; once its .screen ancestor starts animating out the compositor
// fades the skirt spread to 0, so menu↔menu navigation crossfades the skirts.
//
//   cardRefs   React ref whose .current is an array of the card elements
//   logoRef    optional React ref to an <img> whose alpha drives a logo skirt
//   shape      shape key (from SHAPES) the cards are masked to
//   cardSpread skirt width around cards, in CSS px
//   logoSpread skirt width around the logo, in CSS px
function useSkirtField({ cardRefs, logoRef = null, shape, cardSpread = 6, logoSpread = 6 }) {
  React.useLayoutEffect(() => {
    const src = { cardRefs, logoRef, shape, cardSpread, logoSpread, factor: undefined };
    _skirtSources.add(src);
    _skirtStart();
    return () => {
      _skirtSources.delete(src);
      _skirtSig = '';              // force the loop to recompute without this source
      _skirtStart();
    };
  }, [shape, cardSpread, logoSpread]);
}

Object.assign(window, {
  SHAPES, ShapedBg, ShapedShadow, ShapedFill, maskStylesFor,
  ShapedCard, useSkirtField,
});
