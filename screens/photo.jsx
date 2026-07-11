// photo.jsx — Photo Booth screens (intro, capture, grid, edit)

// Shared state — list of captured photos held in module-level store so
// navigating between screens preserves them within one session.
const PhotoStore = (function () {
  let photos = [];
  const listeners = new Set();
  function emit() { listeners.forEach((fn) => fn(photos.slice())); }
  return {
    get() { return photos.slice(); },
    add(p) { photos = [...photos, p]; emit(); },
    setKept(id, kept) {
      photos = photos.map((x) => x.id === id ? { ...x, kept } : x);
      emit();
    },
    setEdit(id, edit) {
      photos = photos.map((x) => x.id === id ? { ...x, ...edit } : x);
      emit();
    },
    reset() { photos = []; emit(); },
    use() {
      const [s, setS] = React.useState(photos.slice());
      React.useEffect(() => {
        const fn = (next) => setS(next);
        listeners.add(fn);
        return () => listeners.delete(fn);
      }, []);
      return s;
    },
  };
})();

// Seed with a couple of pre-existing photos so the grid feels alive
if (PhotoStore.get().length === 0) {
  PhotoStore.add({ id: 'p-seed-1', hue: 340, hue2: 25,  kept: true });
  PhotoStore.add({ id: 'p-seed-2', hue: 200, hue2: 280, kept: false });
}

// ─── Intro screen ─────────────────────────────────────────────────────────
function PhotoIntroScreen({ tweaks }) {
  const nav = useNav();
  return (
    <>
      <ScreenHeader />
      <div className="h1" style={{ marginBottom: 16 }}>Photo Booth</div>
      <div className="tagline" style={{ marginBottom: 36 }}>
        Snap a few pics, slap on filters and stickers, take home a print.
      </div>

      {/* Banner + steps side by side in landscape */}
      <div className="row gap-40" style={{ flex: 1, alignItems: 'center', marginBottom: 36 }}>
      <div className="bubble-card" style={{
        '--card-color': '#FF8FB8', '--card-shadow': '#c2557e',
        borderRadius: 56, padding: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center',
      }}>
        <div className="icon-plate" style={{
          width: 220, height: 220, borderRadius: 999, flexShrink: 0,
        }}>
          <CameraIcon size={140} stroke={5} color="#2a1a2e" />
        </div>
        <div className="col" style={{ gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 56, color: '#2a1a2e', lineHeight: 1 }}>
            Smile big!
          </div>
          <div style={{ fontWeight: 500, fontSize: 26, color: 'rgba(42,26,46,0.85)', lineHeight: 1.35 }}>
            We’ll take a few shots, you pick your favorites, and they print on a glossy 4×6 strip.
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="col gap-20" style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
        {[
          { n: '1', t: 'Tap continue', d: 'Steps you through to the camera screen.' },
          { n: '2', t: 'Take a few pics', d: 'Take as many as you like \u2014 retake any time.' },
          { n: '3', t: 'Pick your keepers', d: 'Check the ones you love. The rest stay private.' },
          { n: '4', t: 'Customize & print', d: 'Add filters and stickers, then we print your strip.' },
        ].map((s) => (
          <div key={s.n} className="bubble-card flat" style={{
            '--card-color': '#ffffff', borderRadius: 28, padding: '20px 26px',
            display: 'flex', gap: 22, alignItems: 'center',
          }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%',
              background: '#FF8FB8', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 36, flexShrink: 0,
              boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15), 0 4px 0 #c2557e',
            }}>{s.n}</div>
            <div className="col" style={{ gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 30, color: '#2a1a2e' }}>{s.t}</div>
              <div style={{ fontWeight: 500, fontSize: 22, color: 'rgba(42,26,46,0.65)' }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      </div>

      <div className="row gap-24" style={{ justifyContent: 'center' }}>
        <Tap as="button" className="btn primary lg" ripple wobble={tweaks.fxWobble}
             onTap={() => nav.go('photo-capture')}>
          Continue →
        </Tap>
      </div>
    </>
  );
}

// ─── Capture screen ───────────────────────────────────────────────────────
function PhotoCaptureScreen({ tweaks }) {
  const nav = useNav();
  const photos = PhotoStore.use();
  const [flashing, setFlashing] = React.useState(false);
  const [thumbAnim, setThumbAnim] = React.useState(null); // { id, hue }
  const [countdown, setCountdown] = React.useState(0);

  function fakeTake() {
    if (countdown > 0) return;
    setCountdown(3);
  }
  React.useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => {
      if (countdown === 1) {
        // capture!
        setFlashing(true);
        setTimeout(() => setFlashing(false), 360);
        const hue = Math.floor(Math.random() * 360);
        const hue2 = (hue + 60) % 360;
        const p = { id: 'p-' + Date.now(), hue, hue2, kept: false };
        PhotoStore.add(p);
        setThumbAnim(p);
        setTimeout(() => setThumbAnim(null), 1500);
      }
      setCountdown((c) => c - 1);
    }, 700);
    return () => clearTimeout(id);
  }, [countdown]);

  const last3 = photos.slice(-3).reverse();

  return (
    <>
      {/* Compact header on this screen — just back btn */}
      <div className="brand-header" style={{ marginBottom: 24, minHeight: 84 }}>
        <BackButton />
        <div className="chip">
          <CameraIcon size={28} stroke={5} color="#2a1a2e" />
          {photos.length} photos taken
        </div>
        <div style={{ width: 84 }} />
      </div>

      <div className="h2" style={{ marginBottom: 6 }}>Look here!</div>
      <div className="tagline" style={{ marginBottom: 18 }}>
        Tap take a picture when you’re ready.
      </div>

      {/* Viewfinder — ~75% of remaining height */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="viewfinder no-scan" style={{
          flex: 1, position: 'relative',
        }}>
          <div className="viewfinder-corner tl" />
          <div className="viewfinder-corner tr" />
          <div className="viewfinder-corner bl" />
          <div className="viewfinder-corner br" />

          {/* Friendly stand-in subject */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 360, height: 480, borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
              background: 'radial-gradient(circle at 50% 35%, rgba(255,200,225,0.45), rgba(255,143,184,0.25) 70%, transparent 80%)',
              border: '2px dashed rgba(255,255,255,0.4)',
            }} />
          </div>

          {/* Countdown */}
          {countdown > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div key={countdown} style={{
                fontFamily: 'Bagel Fat One, Fredoka, sans-serif',
                fontSize: 280, color: 'white',
                textShadow: '0 6px 24px rgba(0,0,0,0.4)',
                animation: 'countdownPulse 700ms ease-out forwards',
              }}>{countdown}</div>
            </div>
          )}

          {/* live photo strip on side */}
          <div style={{
            position: 'absolute', bottom: 24, left: 24,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {last3.map((p) => (
              <div key={p.id} style={{
                width: 80, height: 110, borderRadius: 14,
                background: `linear-gradient(140deg, hsl(${p.hue} 80% 65%), hsl(${p.hue2} 80% 60%))`,
                border: '3px solid white',
                boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
              }} />
            ))}
          </div>

          {/* REC indicator */}
          <div style={{
            position: 'absolute', top: 28, right: 28,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 18px', background: 'rgba(0,0,0,0.55)',
            color: 'white', borderRadius: 999, fontWeight: 600, fontSize: 22,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: '#FF5C5C', boxShadow: '0 0 10px #FF5C5C',
              animation: 'pulse 1.2s infinite',
            }} />
            LIVE
          </div>

          {/* capture flash */}
          {flashing && <div className="capture-flash" />}

          {/* thumb flying */}
          {thumbAnim && (
            <div className="thumb-fly" style={{
              background: `linear-gradient(140deg, hsl(${thumbAnim.hue} 80% 65%), hsl(${thumbAnim.hue2} 80% 60%))`,
            }} />
          )}
        </div>

        {/* Bottom controls */}
        <div className="row gap-24" style={{ marginTop: 28, justifyContent: 'space-between' }}>
          <Tap as="button" className="btn lg" ripple wobble={tweaks.fxWobble}
               style={{ minWidth: 280 }}
               onTap={() => nav.go('photo-grid')}>
            Continue →
          </Tap>
          <Tap as="button" className="btn primary lg" ripple wobble={tweaks.fxWobble}
               style={{ flex: 1, fontSize: 42, padding: '32px 48px' }}
               onTap={fakeTake}>
            <TakePhotoIcon size={48} stroke={4} color="white" />
            Take a Picture
          </Tap>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes countdownPulse {
          from { transform: scale(2); opacity: 0; }
          50%  { transform: scale(1); opacity: 1; }
          to   { transform: scale(0.7); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// ─── Grid screen ──────────────────────────────────────────────────────────
function PhotoTile({ photo, onTap, onToggleKeep, wobble, ripple }) {
  return (
    <Tap
      className="bubble-card flat"
      ripple={ripple}
      wobble={wobble}
      onTap={onTap}
      style={{
        '--card-color': '#ffffff',
        '--ph':  `hsl(${photo.hue}  80% 60%)`,
        '--ph2': `hsl(${photo.hue2} 80% 65%)`,
        borderRadius: 32, padding: 14, aspectRatio: '3 / 4',
        position: 'relative',
      }}
    >
      <div className="photo-sample" />
      {/* keep check */}
      <Tap
        ripple={false}
        onTap={(e) => { e.stopPropagation(); onToggleKeep(); }}
        style={{
          position: 'absolute', top: 22, left: 22,
          width: 64, height: 64, borderRadius: 18,
          background: photo.kept ? '#34D374' : 'rgba(255,255,255,0.95)',
          border: photo.kept ? '3px solid #1f8a47' : '3px solid rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: photo.kept
            ? 'inset 0 -3px 0 rgba(0,0,0,0.15), 0 4px 0 #1f8a47'
            : 'inset 0 -3px 0 rgba(0,0,0,0.06), 0 4px 0 rgba(0,0,0,0.08)',
          zIndex: 5,
        }}
      >
        {photo.kept && <CheckIcon size={40} stroke={6} color="white" />}
      </Tap>
    </Tap>
  );
}

function PhotoGridScreen({ tweaks }) {
  const nav = useNav();
  const photos = PhotoStore.use();
  const keepCount = photos.filter((p) => p.kept).length;

  return (
    <>
      <ScreenHeader />
      <div className="h1" style={{ marginBottom: 8 }}>Pick your keepers</div>
      <div className="tagline" style={{ marginBottom: 24 }}>
        Tap the checkmark on each one you love. Tap a photo to edit it.
      </div>

      <div className="row between" style={{ alignItems: 'center', marginBottom: 24 }}>
        <div className="chip" style={{ background: '#34D374', color: 'white', border: '2.5px solid #1f8a47' }}>
          <CheckIcon size={28} stroke={5.5} color="white" />
          {keepCount} {keepCount === 1 ? 'keeper' : 'keepers'}
        </div>
        <Tap as="button" className="btn sm" ripple
             onTap={() => nav.go('photo-capture')}>
          + Take more
        </Tap>
      </div>

      <div className="scroll-y flex-1" style={{ paddingRight: 8 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 28,
        }}>
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              ripple={tweaks.fxRipple}
              wobble={tweaks.fxWobble}
              onToggleKeep={() => PhotoStore.setKept(p.id, !p.kept)}
              onTap={() => nav.go('photo-edit', { photoId: p.id })}
            />
          ))}
          {photos.length === 0 && (
            <div className="body" style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: 40,
            }}>
              No photos yet — head back and take some!
            </div>
          )}
        </div>
      </div>

      <div className="row gap-24" style={{ marginTop: 28, justifyContent: 'space-between' }}>
        <Tap as="button" className="btn lg" ripple onTap={() => nav.back()}>
          Back to camera
        </Tap>
        <Tap as="button" className="btn primary lg" ripple wobble={tweaks.fxWobble}
             onTap={() => nav.reset('menu')}>
          Print {keepCount > 0 ? `(${keepCount}) →` : '→'}
        </Tap>
      </div>
    </>
  );
}

// ─── Photo edit screen ────────────────────────────────────────────────────
const FILTERS = [
  { id: 'none',    label: 'Original', css: 'none', sw: 'linear-gradient(140deg, #ddd, #aaa)' },
  { id: 'warm',    label: 'Warm',     css: 'sepia(0.3) saturate(1.4) hue-rotate(-12deg)', sw: 'linear-gradient(140deg, #ffd28a, #ff8c5e)' },
  { id: 'cool',    label: 'Cool',     css: 'saturate(1.2) hue-rotate(20deg) brightness(1.05)', sw: 'linear-gradient(140deg, #9ed6ff, #6f7fff)' },
  { id: 'mono',    label: 'Mono',     css: 'grayscale(1) contrast(1.15)', sw: 'linear-gradient(140deg, #ddd, #333)' },
  { id: 'dream',   label: 'Dream',    css: 'blur(0.4px) saturate(1.4) brightness(1.08) hue-rotate(-8deg)', sw: 'linear-gradient(140deg, #ffc6e5, #c2a8ff)' },
  { id: 'sunny',   label: 'Sunny',    css: 'saturate(1.5) brightness(1.1) contrast(1.05)', sw: 'linear-gradient(140deg, #fff39e, #ffb15e)' },
  { id: 'noir',    label: 'Noir',     css: 'grayscale(1) contrast(1.3) brightness(0.95)', sw: 'linear-gradient(140deg, #999, #111)' },
  { id: 'fairy',   label: 'Fairy',    css: 'saturate(1.3) hue-rotate(40deg) brightness(1.05)', sw: 'linear-gradient(140deg, #d9ffe8, #b7d8ff)' },
];

const STICKERS = [
  { id: 'heart',   label: 'Heart',   emoji: '\u2764\ufe0f', color: '#FF6FA3' },
  { id: 'star',    label: 'Star',    emoji: '\u2b50',       color: '#FFC857' },
  { id: 'sparkle', label: 'Sparkle', emoji: '\u2728',       color: '#FFE48F' },
  { id: 'flower',  label: 'Flower',  emoji: '\ud83c\udf38', color: '#FFB6CE' },
  { id: 'rainbow', label: 'Rainbow', emoji: '\ud83c\udf08', color: '#A8DCFF' },
  { id: 'cake',    label: 'Cake',    emoji: '\ud83c\udf82', color: '#FFB6CE' },
  { id: 'crown',   label: 'Crown',   emoji: '\ud83d\udc51', color: '#FFD45B' },
  { id: 'frog',    label: 'Frog',    emoji: '\ud83d\udc38', color: '#9FECC4' },
  { id: 'cat',     label: 'Cat',     emoji: '\ud83d\udc31', color: '#C8B4F2' },
  { id: 'fire',    label: 'Fire',    emoji: '\ud83d\udd25', color: '#FF8E5C' },
];

function PhotoEditScreen({ photoId, tweaks }) {
  const photos = PhotoStore.use();
  const photo = photos.find((p) => p.id === photoId) || photos[0];
  const [tray, setTray] = React.useState(null); // null | 'filters' | 'stickers'
  const [filter, setFilter] = React.useState(photo?.filter || 'none');
  const [stickers, setStickers] = React.useState(photo?.stickers || []);

  if (!photo) return <div className="screen">No photo.</div>;

  const filterCss = FILTERS.find((f) => f.id === filter)?.css || 'none';

  return (
    <>
      <div className="brand-header" style={{ marginBottom: 18, minHeight: 84 }}>
        <BackButton />
        <div className="chip">Edit photo</div>
        <div style={{ width: 84 }} />
      </div>

      {/* Photo big */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          height: '100%', width: 'auto', maxWidth: '90%', aspectRatio: '3 / 4',
          borderRadius: 36, padding: 18,
          background: 'white',
          border: '3px solid rgba(0,0,0,0.08)',
          boxShadow:
            'inset 0 -6px 0 rgba(0,0,0,0.06), 0 16px 30px rgba(60,20,40,0.18)',
          position: 'relative',
        }}>
          <div className="photo-sample" style={{
            '--ph':  `hsl(${photo.hue}  80% 60%)`,
            '--ph2': `hsl(${photo.hue2} 80% 65%)`,
            filter: filterCss,
          }} />
          {/* placed stickers */}
          {stickers.map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: (15 + (i * 17) % 60) + '%',
              top:  (12 + (i * 23) % 60) + '%',
              fontSize: 84, transform: `rotate(${(i * 17) % 30 - 15}deg)`,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
            }}>{s.emoji}</div>
          ))}
        </div>
      </div>

      {/* Tool buttons + tray */}
      <div style={{ marginTop: 24, position: 'relative', minHeight: 200 }}>
        {/* Buttons row */}
        <div style={{
          display: 'flex',
          gap: 28,
          justifyContent: tray === 'filters' ? 'flex-start'
                         : tray === 'stickers' ? 'flex-end' : 'center',
          transition: 'all 360ms cubic-bezier(.22,1.2,.36,1)',
        }}>
          <Tap as="button" className="btn lg" ripple wobble={tweaks.fxWobble}
               style={{
                 transform: tray === 'stickers' ? 'translateX(-150%)' : 'translateX(0)',
                 opacity: tray === 'stickers' ? 0 : 1,
                 transition: 'transform 360ms cubic-bezier(.22,1.2,.36,1), opacity 200ms',
                 background: tray === 'filters' ? '#FF8FB8' : undefined,
                 color: tray === 'filters' ? 'white' : undefined,
                 boxShadow: tray === 'filters'
                   ? 'inset 0 -5px 0 rgba(0,0,0,0.18), inset 0 4px 0 rgba(255,255,255,0.35), 0 8px 0 #c2557e, 0 14px 24px rgba(193,66,117,0.35)'
                   : undefined,
               }}
               onTap={() => setTray(tray === 'filters' ? null : 'filters')}>
            <FilterIcon size={36} stroke={4.5} color={tray === 'filters' ? 'white' : '#2a1a2e'} />
            Filters
          </Tap>
          <Tap as="button" className="btn lg" ripple wobble={tweaks.fxWobble}
               style={{
                 transform: tray === 'filters' ? 'translateX(150%)' : 'translateX(0)',
                 opacity: tray === 'filters' ? 0 : 1,
                 transition: 'transform 360ms cubic-bezier(.22,1.2,.36,1), opacity 200ms',
                 background: tray === 'stickers' ? '#FF8FB8' : undefined,
                 color: tray === 'stickers' ? 'white' : undefined,
                 boxShadow: tray === 'stickers'
                   ? 'inset 0 -5px 0 rgba(0,0,0,0.18), inset 0 4px 0 rgba(255,255,255,0.35), 0 8px 0 #c2557e, 0 14px 24px rgba(193,66,117,0.35)'
                   : undefined,
               }}
               onTap={() => setTray(tray === 'stickers' ? null : 'stickers')}>
            <StickerIcon size={36} stroke={4.5} color={tray === 'stickers' ? 'white' : '#2a1a2e'} />
            Stickers
          </Tap>
        </div>

        {/* Horizontal tray */}
        {tray && (
          <div className="scroll-x" style={{
            marginTop: 22,
            paddingBottom: 10,
            animation: 'trayUp 320ms cubic-bezier(.22,1.2,.36,1) both',
          }}>
            <div style={{ display: 'flex', gap: 18, paddingRight: 56 }}>
              {tray === 'filters' && FILTERS.map((f) => (
                <Tap key={f.id}
                  ripple
                  onTap={() => setFilter(f.id)}
                  className="bubble-card flat"
                  style={{
                    '--card-color': 'white',
                    flexShrink: 0,
                    width: 152, padding: 12,
                    borderRadius: 24,
                    boxShadow: f.id === filter
                      ? 'inset 0 0 0 4px #FF6FA3, 0 6px 12px rgba(0,0,0,0.12)'
                      : '0 6px 12px rgba(0,0,0,0.12)',
                  }}>
                  <div style={{
                    width: '100%', aspectRatio: '1 / 1', borderRadius: 16,
                    background: f.sw, marginBottom: 8,
                  }} />
                  <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 22, color: '#2a1a2e' }}>
                    {f.label}
                  </div>
                </Tap>
              ))}
              {tray === 'stickers' && STICKERS.map((s) => (
                <Tap key={s.id}
                  ripple wobble={tweaks.fxWobble}
                  onTap={() => setStickers((cur) => [...cur, s])}
                  className="bubble-card flat"
                  style={{
                    '--card-color': s.color,
                    flexShrink: 0,
                    width: 152, padding: 12,
                    borderRadius: 24,
                  }}>
                  <div style={{
                    width: '100%', aspectRatio: '1 / 1', borderRadius: 16,
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 72,
                  }}>{s.emoji}</div>
                  <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 22, color: '#2a1a2e', marginTop: 6 }}>
                    {s.label}
                  </div>
                </Tap>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes trayUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </>
  );
}

Object.assign(window, {
  PhotoIntroScreen, PhotoCaptureScreen, PhotoGridScreen, PhotoEditScreen,
  PhotoStore,
});
