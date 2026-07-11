/* shader-bg.js — Mercury liquid-chrome background, scoped to a canvas.
 *
 * Faithful port of the "Mercury" WebGL effect: an ambient field of lazy
 * metaball "blobs" rendered as reflective mercury, plus a mouse-drag smudge
 * trail and click ripples. All the debug UI / lava / fluid / blob toggles
 * from the original have been removed — this is the default mercury look only.
 *
 * Usage:  window.mountMercury(canvasElement)  ->  returns
 *   { setTint, setFinish, setSnake, setCardField, destroy }
 * setCardField(canvas|null) feeds a baked "skirt field" (red channel = risen
 * liquid hugging each card's real silhouette) so the surface swells around the
 * menu cards. The canvas is sized to its own layout box (ResizeObserver) and
 * is mapped through getBoundingClientRect so it works inside a scaled frame.
 */
(function () {
  'use strict';

  const VS = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const BRUSH_VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const BRUSH_FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_prev;
uniform float u_fade;
uniform vec2  u_bufRes;
uniform vec2  u_mouseA;
uniform vec2  u_mouseB;
uniform float u_brushRadius;
uniform float u_brushStrength;
uniform float u_inside;
uniform float u_motionFactor;
uniform float u_blobMode;   // 1 = Snake (max high-water mark), 0 = additive trail

float distToSegment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float len2 = dot(ab, ab);
  float t = len2 > 0.0001 ? clamp(dot(p - a, ab) / len2, 0.0, 1.0) : 0.0;
  return distance(p, a + t * ab);
}

void main() {
  vec4 prev = texture2D(u_prev, v_uv);
  vec2 p = v_uv * u_bufRes;
  float d = distToSegment(p, u_mouseA, u_mouseB);
  float falloff = u_brushRadius;
  float stamp = exp(-(d * d) / (falloff * falloff));
  float decayed = prev.r * u_fade - 0.0035;
  // Additive: leaky integrator scaled by motion (soft smudge).
  float addVal  = decayed + stamp * u_brushStrength * u_motionFactor * u_inside;
  // Snake: hold the gaussian bump as a high-water mark; the trail is the
  // decaying peak left behind, so liquid pools and follows like a snake.
  float blobVal = max(decayed, stamp * u_brushStrength * u_inside);
  float val = mix(addVal, blobVal, u_blobMode);
  val = clamp(val, 0.0, 1.0);
  gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
}`;

  const FS = `
precision highp float;

uniform vec2  u_res;
uniform vec2  u_resCss;
uniform float u_time;
uniform vec4  u_ripples[8];
uniform sampler2D u_brush;
uniform float u_brushAmp;
uniform float u_dpr;
uniform vec3  u_tint;     // base liquid color (from the Wallpaper toggle)
uniform float u_finish;   // 0 = strawberry milk, 1 = matte paint, 2 = glossy
uniform sampler2D u_cardField; // baked skirt: soft ridge hugging each card edge
uniform float u_cardAmp;       // global skirt strength (0 = no cards measured yet)
uniform float u_skirtMerge;    // 0..1 how strongly the waves sculpt the skirt
uniform float u_skirtMode;     // 0 Current · 1 Tide · 2 Flow · 3 Swell

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = r * p * 2.02;
    a *= 0.5;
  }
  return v;
}

float heightField(vec2 uv, float t) {
  vec2 q = vec2(
    fbm(uv * 0.55 + vec2(0.0, t * 0.05)),
    fbm(uv * 0.55 + vec2(5.3, -t * 0.04))
  );
  vec2 r = vec2(
    fbm(uv * 0.7 + 2.5 * q + vec2(1.7, 9.2) + t * 0.07),
    fbm(uv * 0.7 + 2.5 * q + vec2(8.3, 2.8) - t * 0.06)
  );
  float base = fbm(uv * 0.6 + 3.0 * r + t * 0.03);
  float blobs = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float phase = fi * 1.7;
    vec2 c = vec2(
      0.5 + 0.55 * sin(t * (0.09 + 0.025 * fi) + phase),
      0.5 + 0.45 * cos(t * (0.075 + 0.03 * fi) + phase * 1.3)
    );
    vec2 d = uv - c;
    float radius = 0.42 + 0.08 * sin(t * 0.25 + phase);
    float k = exp(-dot(d, d) / (radius * radius));
    blobs += k;
  }
  float surface = base * 0.55 + 0.75 * smoothstep(0.0, 2.5, blobs);
  return surface;
}

float disturbance(vec2 fragPx, float t) {
  float h = 0.0;
  vec2 buv = fragPx / u_resCss;
  buv = clamp(buv, vec2(0.0), vec2(1.0));
  h += texture2D(u_brush, buv).r * u_brushAmp;

  const float RIPPLE_LIFE = 7.0;
  const float RIPPLE_FADE_TAIL = 1.0;
  for (int i = 0; i < 8; i++) {
    vec4 R = u_ripples[i];
    if (R.w <= 0.0) continue;
    float age = t - R.z;
    if (age < 0.0 || age > RIPPLE_LIFE) continue;
    float d = distance(fragPx, R.xy);
    float splashAmt = exp(-d * d / 14000.0);
    float splashDecay = exp(-age * 5.5);
    float splash = splashAmt * splashDecay * 1.4;
    float radius = age * 420.0;
    float ringWidth = 70.0 + age * 50.0;
    float ring = exp(-pow((d - radius) / ringWidth, 2.0));
    float ringDecay = exp(-age * 0.5);
    // Single outward ring (no oscillating sin -> one ripple per tap)
    float ringContribution = ring * ringDecay;
    float tail = smoothstep(RIPPLE_LIFE, RIPPLE_LIFE - RIPPLE_FADE_TAIL, age);
    h += R.w * (splash + 0.7 * ringContribution) * tail;
  }

  return h;
}

// ── Card skirt sample ───────────────────────────────────────────────────
// A baked field (built on the CPU from the cards' actual silhouettes) holds a
// tight ridge of risen liquid hugging each footprint. Returned RAW here (not
// pre-added to the disturbance) so main() can fold it into the SAME height as
// the ambient waves — the meniscus then rises and falls with the liquid level
// instead of floating as a flat decal on top of it.
float cardSkirt(vec2 fragPx) {
  if (u_cardAmp <= 0.0) return 0.0;
  vec2 buv = clamp(fragPx / u_resCss, vec2(0.0), vec2(1.0));
  return texture2D(u_cardField, buv).r;
}

// Soft saturating clamp for the skirt meniscus: floors at 0 so the ridge can
// never invert into a below-liquid moat (which flips the surface normals), and
// smoothly approaches 'cap' from below so a tall wave crest can't spike it into
// a sharp, glassy artifact. Reinhard-style knee -> no hard banding.
float skirtClamp(float x, float cap) {
  x = max(x, 0.0);
  return cap * x / (cap + x);
}

// Soft tinted-liquid shading: a milky base color lit by the surface normal
// with a gentle sheen -- no mirror reflections. H is the surface height so
// raised regions read a touch creamier, like cream swirled into milk.
vec3 paintColor(vec3 n, float H) {
  vec3 base  = u_tint;
  // Boost saturation a touch so even pale picks read as a clear hue rather
  // than near-white. (mixing AWAY from luma raises saturation.)
  float luma = dot(base, vec3(0.299, 0.587, 0.114));
  base = clamp(mix(vec3(luma), base, 1.4), 0.0, 1.0);
  vec3 white = vec3(1.0);
  vec3 L = normalize(vec3(0.35, 0.6, 0.72));
  float lam = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0); // soft wrap light

  // Shading varies the BRIGHTNESS of the chosen color rather than mixing it
  // toward white — that keeps the hue saturated and true instead of washed.
  float loMul    = 0.88;   // shadow brightness
  float hiMul    = 1.06;   // highlight brightness (kept off pure white)
  float creamAmt = 0.16;   // small milk bloom on the brightest crests
  float specAmt  = 0.08;   // sheen strength (half of original)
  float specPow  = 48.0;   // sheen tightness
  if (u_finish > 1.5) {            // glossy
    loMul = 0.86; hiMul = 1.12; creamAmt = 0.14; specAmt = 0.275; specPow = 90.0;
  } else if (u_finish > 0.5) {     // matte paint
    loMul = 0.86; hiMul = 1.02; creamAmt = 0.05; specAmt = 0.025; specPow = 18.0;
  }

  float bright = mix(loMul, hiMul, smoothstep(0.10, 0.95, lam));
  vec3 col = base * bright;

  // a hint of cream only on raised crests, for the milky character
  vec3 cream = mix(base, white, 0.4);
  col = mix(col, cream, smoothstep(0.9, 1.7, H) * creamAmt);

  float spec = pow(max(dot(n, L), 0.0), specPow);
  col += white * spec * specAmt;
  return col;
}

void main() {
  vec2 fragPx = gl_FragCoord.xy / u_dpr;
  vec2 uv = fragPx / (u_res / u_dpr);

  float aspect = u_res.x / u_res.y;
  vec2 fuv = vec2(uv.x * aspect, uv.y);
  float t = u_time;
  float tField = t * 0.5;   // ambient drift runs at half speed

  float eps = 1.5;
  vec2 px = vec2(eps, 0.0) / (u_res / u_dpr);
  vec2 py = vec2(0.0, eps) / (u_res / u_dpr);
  vec2 fpx = vec2(px.x * aspect, px.y);
  vec2 fpy = vec2(py.x * aspect, py.y);

  float h    = heightField(fuv,         tField);
  float hx   = heightField(fuv + fpx,   tField);
  float hy   = heightField(fuv + fpy,   tField);

  float d    = disturbance(fragPx,                t);
  float dx   = disturbance(fragPx + vec2(eps,0.), t);
  float dy   = disturbance(fragPx + vec2(0.,eps), t);

  // ── Skirt × wave interaction (modes selectable via Tweaks) ──────────────
  // KEY: the ambient wave must drive the skirt the way a tap ripple does — as
  // an ADDITIVE, travelling height — otherwise a ring locked to a fixed screen
  // position just modulates its amplitude and the eye reads it as static.
  // So we build the skirt from the wave's DEVIATION about a mid level: where a
  // crest sits the meniscus SWELLS, where a trough passes it flattens (even
  // dips into a moat). A bright wave streak rolling across a card now visibly
  // lifts the skirt on that side and drops it on the other.
  float mrg  = clamp(u_skirtMerge, 0.0, 1.0);
  int   mode = int(u_skirtMode + 0.5);

  const float HREF = 0.5;   // mid liquid level the skirt swells above / sinks below

  // Flow mode: displace the skirt SAMPLE along the wave so the ridge outline
  // wobbles like a live liquid edge instead of a baked silhouette.
  vec2 warp = vec2(0.0);
  if (mode == 2) {
    float ph = h * 6.2831853;
    warp = vec2(cos(ph), sin(ph)) * mix(6.0, 34.0, mrg);
  }
  float sk   = cardSkirt(fragPx + warp);
  float skx  = cardSkirt(fragPx + warp + vec2(eps,0.));
  float sky  = cardSkirt(fragPx + warp + vec2(0.,eps));
  // Swell mode: broaden the ridge profile into a soft, wide mound.
  if (mode == 3) { sk = sqrt(sk); skx = sqrt(skx); sky = sqrt(sky); }

  // Per-mode balance of the static cling vs the wave drive.
  float lipK = 1.0, wgnK = 1.0;
  if (mode == 1) { lipK = 0.45; wgnK = 1.6; }   // Tide: wave-dominated, washes over the lip
  if (mode == 3) { lipK = 1.30; wgnK = 0.9; }   // Swell: fuller soft base, gentler pump
  float lip = mix(0.95, 0.40, mrg) * lipK;      // static cling at rest (shrinks as merge rises)
  float wgn = mix(1.40, 4.40, mrg) * wgnK;      // how hard the wave drives the skirt

  // Skirt height = silhouette × clamped(static lip + wave deviation × gain).
  // The soft clamp keeps the meniscus from inverting in deep troughs or
  // spiking past 'cap' under tall crests, so it always reads as liquid.
  float cap = mix(1.7, 3.4, mrg);
  float E  = sk  * u_cardAmp * skirtClamp(lip + (h  - HREF) * wgn, cap);
  float Ex = skx * u_cardAmp * skirtClamp(lip + (hx - HREF) * wgn, cap);
  float Ey = sky * u_cardAmp * skirtClamp(lip + (hy - HREF) * wgn, cap);

  // tap/drag: gentle coupling so feedback stays punchy but still breathes
  float dM   = mix(0.78, 1.18, smoothstep(0.0, 1.10, h ));
  float dMx  = mix(0.78, 1.18, smoothstep(0.0, 1.10, hx));
  float dMy  = mix(0.78, 1.18, smoothstep(0.0, 1.10, hy));

  float H    = h  + E  + d  * 0.9 * dM;
  float Hx   = hx + Ex + dx * 0.9 * dMx;
  float Hy   = hy + Ey + dy * 0.9 * dMy;

  float scale = 7.0;   // gentler slopes than chrome -> soft, subtle relief
  vec3 n = normalize(vec3(
    (Hx - H) * scale * (u_res.x / u_dpr) / eps,
    (Hy - H) * scale * (u_res.y / u_dpr) / eps,
    1.0
  ));
  n.y = -n.y;

  vec3 col = paintColor(n, H);

  // gentle vignette (much lighter than chrome so the color stays even)
  vec2 vUv = uv - 0.5;
  float vign = 1.0 - dot(vUv, vUv) * 0.20;
  col *= vign;

  // fine grain to break up banding in the smooth pastel gradients
  float g = (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;
  col += g;

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

  function mountMercury(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) { console.warn('[mercury] WebGL not available'); return { destroy() {} }; }

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s)); console.error(src);
        throw new Error('shader compile failed');
      }
      return s;
    }
    function makeProgram(vsSrc, fsSrc) {
      const v = compile(gl.VERTEX_SHADER, vsSrc);
      const f = compile(gl.FRAGMENT_SHADER, fsSrc);
      const p = gl.createProgram();
      gl.attachShader(p, v); gl.attachShader(p, f);
      gl.bindAttribLocation(p, 0, 'a_pos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(p)); throw new Error('link failed');
      }
      return p;
    }

    const mainProg  = makeProgram(VS, FS);
    const brushProg = makeProgram(BRUSH_VS, BRUSH_FS);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uRes      = gl.getUniformLocation(mainProg, 'u_res');
    const uResCss   = gl.getUniformLocation(mainProg, 'u_resCss');
    const uTime     = gl.getUniformLocation(mainProg, 'u_time');
    const uRipples  = gl.getUniformLocation(mainProg, 'u_ripples[0]');
    const uBrushTex = gl.getUniformLocation(mainProg, 'u_brush');
    const uBrushAmp = gl.getUniformLocation(mainProg, 'u_brushAmp');
    const uDpr      = gl.getUniformLocation(mainProg, 'u_dpr');
    const uTint     = gl.getUniformLocation(mainProg, 'u_tint');
    const uFinish   = gl.getUniformLocation(mainProg, 'u_finish');
    const uCardField = gl.getUniformLocation(mainProg, 'u_cardField');
    const uCardAmp  = gl.getUniformLocation(mainProg, 'u_cardAmp');
    const uSkirtMerge = gl.getUniformLocation(mainProg, 'u_skirtMerge');
    const uSkirtMode = gl.getUniformLocation(mainProg, 'u_skirtMode');

    const uB_prev     = gl.getUniformLocation(brushProg, 'u_prev');
    const uB_fade     = gl.getUniformLocation(brushProg, 'u_fade');
    const uB_bufRes   = gl.getUniformLocation(brushProg, 'u_bufRes');
    const uB_mouseA   = gl.getUniformLocation(brushProg, 'u_mouseA');
    const uB_mouseB   = gl.getUniformLocation(brushProg, 'u_mouseB');
    const uB_radius   = gl.getUniformLocation(brushProg, 'u_brushRadius');
    const uB_strength = gl.getUniformLocation(brushProg, 'u_brushStrength');
    const uB_inside   = gl.getUniformLocation(brushProg, 'u_inside');
    const uB_motion   = gl.getUniformLocation(brushProg, 'u_motionFactor');
    const uB_blob     = gl.getUniformLocation(brushProg, 'u_blobMode');

    let DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const start = performance.now();
    const nowT = () => (performance.now() - start) / 1000;

    // ---- live appearance state (driven by the Wallpaper toggle) ----
    function hexToRgb(hex) {
      const m = String(hex || '').trim().replace('#', '');
      const s = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
      const n = parseInt(s, 16);
      if (isNaN(n) || s.length !== 6) return [1, 0.85, 0.89];
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }
    let tint = hexToRgb('#FFD9E3');
    let finish = 0;
    let snake = 0;   // 1 = Snake (blob) brush mode
    let skirtMerge = 0.7;   // how strongly the waves sculpt the card skirt
    let skirtMode = 0;      // 0 Current · 1 Tide · 2 Flow · 3 Swell
    let dragOn = 1;         // 1 = pointer drag paints a trail (snake/smudge)

    // Baked card skirt field (built by the menu screen from the real card
    // silhouettes). Sampled in CSS-px / bottom-left space, same as the brush.
    const CARD_AMP = 1.5;
    let cardAmp = 0.0;
    let cardTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cardTex);
    // 1×1 black placeholder so the sampler is always valid before cards arrive.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // brush field uses an UNSIGNED_BYTE ping-pong (simple + universal)
    function createTarget(w, h) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo, w, h };
    }
    let ping = null, pong = null, brushW = 0, brushH = 0;

    function setupBrushBuffers() {
      brushW = Math.min(2048, Math.max(1, canvas.width));
      brushH = Math.min(2048, Math.max(1, canvas.height));
      if (ping) { gl.deleteTexture(ping.tex); gl.deleteFramebuffer(ping.fbo); }
      if (pong) { gl.deleteTexture(pong.tex); gl.deleteFramebuffer(pong.fbo); }
      ping = createTarget(brushW, brushH);
      pong = createTarget(brushW, brushH);
      for (const tt of [ping, pong]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, tt.fbo);
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, canvas.clientWidth  || canvas.offsetWidth  || 1);
      const h = Math.max(1, canvas.clientHeight || canvas.offsetHeight || 1);
      canvas.width  = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      setupBrushBuffers();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ---- input (mapped through bounding rect so a scaled frame works) ----
    let mouseX = 0, mouseY = 0, prevMouseX = 0, prevMouseY = 0, inside = 0;
    let down = 0;   // 1 while the pointer is pressed / a touch is active
    function cssDims() {
      return {
        w: Math.max(1, canvas.clientWidth || canvas.offsetWidth || 1),
        h: Math.max(1, canvas.clientHeight || canvas.offsetHeight || 1),
      };
    }
    function toLocal(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const { w, h } = cssDims();
      const lx = (clientX - r.left) / Math.max(1, r.width)  * w;
      const lyTop = (clientY - r.top) / Math.max(1, r.height) * h;
      return { x: lx, y: h - lyTop, inside: lx >= 0 && lx <= w && lyTop >= 0 && lyTop <= h };
    }
    function onMove(clientX, clientY) {
      const p = toLocal(clientX, clientY);
      mouseX = p.x; mouseY = p.y; inside = p.inside ? 1 : 0;
    }
    const mm = (e) => onMove(e.clientX, e.clientY);
    const tm = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const ml = () => { inside = 0; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseleave', ml);
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('touchstart', tm, { passive: true });
    window.addEventListener('touchend', ml);

    // ---- click ripples ----
    const RIPPLE_SLOTS = 8;
    const ripples = new Float32Array(RIPPLE_SLOTS * 4);
    let ripIdx = 0;
    function addRipple(clientX, clientY, strength) {
      const p = toLocal(clientX, clientY);
      if (!p.inside) return;
      const i = ripIdx % RIPPLE_SLOTS;
      ripples[i * 4 + 0] = p.x;
      ripples[i * 4 + 1] = p.y;
      ripples[i * 4 + 2] = nowT();
      ripples[i * 4 + 3] = strength;
      ripIdx++;
    }
    // Press starts a paint stroke: snap the brush to the press point (so the
    // first frame doesn't draw a long segment from a stale position) and
    // raise the `down` flag that gates the trail.
    const md = (e) => {
      onMove(e.clientX, e.clientY);
      prevMouseX = mouseX; prevMouseY = mouseY;
      down = 1;
      addRipple(e.clientX, e.clientY, 1.4);
    };
    const ts = (e) => {
      if (!e.touches[0]) return;
      onMove(e.touches[0].clientX, e.touches[0].clientY);
      prevMouseX = mouseX; prevMouseY = mouseY;
      down = 1;
      addRipple(e.touches[0].clientX, e.touches[0].clientY, 1.4);
    };
    const up = () => { down = 0; };
    window.addEventListener('mousedown', md);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchstart', ts, { passive: true });
    window.addEventListener('touchcancel', up);
    // touchend clears both hover + press
    window.addEventListener('touchend', up);

    const BRUSH_RADIUS_CSS = 70;
    const BRUSH_STRENGTH   = 0.7;
    const BRUSH_FADE       = 0.985;
    let smoothedSpeed = 0;

    let raf = 0, alive = true, lastFrameT = performance.now();
    function frame(now) {
      if (!alive) return;
      const t = (now - start) / 1000;
      const dt = Math.max(0.001, (now - lastFrameT) / 1000);
      lastFrameT = now;

      const cssW = canvas.width / DPR, cssH = canvas.height / DPR;
      const sx = brushW / cssW, sy = brushH / cssH;

      const segLen = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY);
      const instSpeed = segLen / dt;
      const attack = 1 - Math.pow(0.0001, dt);
      const release = 1 - Math.pow(0.05, dt);
      const k = instSpeed > smoothedSpeed ? attack : release;
      smoothedSpeed += (instSpeed - smoothedSpeed) * k;
      const motionFactor = Math.min(1, smoothedSpeed / 900);
      // Trail only paints while pressed; a held press still lays down a
      // gentle mark even without much movement (floor of 0.30).
      const paintFactor = down ? Math.max(0.30, motionFactor) : 0.0;

      // brush pass
      gl.useProgram(brushProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, pong.fbo);
      gl.viewport(0, 0, brushW, brushH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, ping.tex);
      gl.uniform1i(uB_prev, 0);
      gl.uniform1f(uB_fade, BRUSH_FADE);
      gl.uniform2f(uB_bufRes, brushW, brushH);
      gl.uniform2f(uB_mouseA, prevMouseX * sx, prevMouseY * sy);
      gl.uniform2f(uB_mouseB, mouseX * sx, mouseY * sy);
      gl.uniform1f(uB_radius, BRUSH_RADIUS_CSS * sx);
      gl.uniform1f(uB_strength, BRUSH_STRENGTH);
      // Drag trail can be switched off (Tweak): zero the paint input so the
      // brush field stops accumulating — it then fades out on its own.
      gl.uniform1f(uB_inside, down * dragOn);
      gl.uniform1f(uB_motion, paintFactor * dragOn);
      gl.uniform1f(uB_blob, snake);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      const tmp = ping; ping = pong; pong = tmp;

      // main pass
      gl.useProgram(mainProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, ping.tex);
      gl.uniform1i(uBrushTex, 0);
      gl.uniform1f(uBrushAmp, 1.4 * dragOn);
      gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
      gl.uniform1f(uFinish, finish);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cardTex);
      gl.uniform1i(uCardField, 1);
      gl.uniform1f(uCardAmp, cardAmp);
      gl.uniform1f(uSkirtMerge, skirtMerge);
      gl.uniform1f(uSkirtMode, skirtMode);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uResCss, cssW, cssH);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uDpr, DPR);
      gl.uniform4fv(uRipples, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      prevMouseX = mouseX; prevMouseY = mouseY;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      setTint(hex) { tint = hexToRgb(hex); },
      setFinish(f) {
        const map = { milk: 0, matte: 1, gloss: 2 };
        finish = typeof f === 'number' ? f : (map[f] != null ? map[f] : 0);
      },
      setSnake(on) { snake = on ? 1 : 0; },
      setSkirtMerge(v) { skirtMerge = Math.max(0, Math.min(1, +v || 0)); },
      setSkirtMode(m) {
        const map = { current: 0, tide: 1, flow: 2, swell: 3 };
        skirtMode = typeof m === 'number' ? m : (map[m] != null ? map[m] : 0);
      },
      setDrag(on) { dragOn = on ? 1 : 0; },
      // Accepts a canvas/image whose RED channel encodes the skirt height
      // (built from the real card silhouettes), or null to clear it. Uploaded
      // flipped so it lines up with the shader's bottom-left sampling.
      setCardField(source) {
        if (!source) { cardAmp = 0.0; return; }
        gl.bindTexture(gl.TEXTURE_2D, cardTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        cardAmp = CARD_AMP;
      },
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        if (cardTex) gl.deleteTexture(cardTex);
        ro.disconnect();
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseleave', ml);
        window.removeEventListener('touchmove', tm);
        window.removeEventListener('touchstart', tm);
        window.removeEventListener('mousedown', md);
        window.removeEventListener('mouseup', up);
        window.removeEventListener('touchstart', ts);
        window.removeEventListener('touchcancel', up);
        window.removeEventListener('touchend', up);
      },
    };
  }

  window.mountMercury = mountMercury;
})();
