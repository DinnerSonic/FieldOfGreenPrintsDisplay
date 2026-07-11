// scan.jsx — 3D scan hub + live camera placeholder

const SCAN_TYPES = [
  { key: 'figurine',    label: 'Figurine',        sub: 'Full-body mini, 100mm tall',
    icon: FigurineIcon, color: '#FFC857', shadow: '#c69737' },
  { key: 'fidget',      label: 'Fidget Figurine', sub: 'Articulated, spinnable',
    icon: FidgetIcon,   color: '#A8DCFF', shadow: '#6ba7d0' },
  { key: 'bobble',      label: 'Bobble Head',     sub: 'Oversized noggin energy',
    icon: BobbleIcon,   color: '#FF8FB8', shadow: '#c2557e' },
  { key: 'misc',        label: 'Misc',            sub: 'Hands, props, your choice',
    icon: SparkleIcon,  color: '#9FECC4', shadow: '#5fb389' },
];

function ScanTypeCard({ item, shape, ripple, wobble, peel, lip, onTap, cardRef }) {
  const Ico = item.icon;
  return (
    <ShapedCard
      cardRef={cardRef}
      shape={shape}
      color={item.color}
      shadow={item.shadow}
      lip={lip}
      ripple={ripple}
      wobble={wobble}
      peel={peel}
      onTap={onTap}
      contentStyle={{
        padding: 40,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        gap: 20,
      }}
    >
      <div className="icon-plate" style={{
        position: 'relative', zIndex: 1,
        width: 132, height: 132, borderRadius: 999, alignSelf: 'flex-start',
      }}>
        <Ico size={80} stroke={5.2} color="#2a1a2e" />
      </div>
      <div className="col" style={{ position: 'relative', zIndex: 1, gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 40, color: '#2a1a2e', lineHeight: 1.0 }}>
          {item.label}
        </div>
        <div style={{ fontWeight: 500, fontSize: 20, color: 'rgba(42,26,46,0.7)' }}>
          {item.sub}
        </div>
      </div>
    </ShapedCard>
  );
}

function ScanHubScreen({ tweaks }) {
  const nav = useNav();
  const cardRefs = React.useRef([]);
  useSkirtField({
    cardRefs,
    shape: tweaks.cardShape,
    cardSpread: tweaks.skirtSpread ?? 6,
  });
  return (
    <>
      <ScreenHeader />
      <div className="h1" style={{ marginBottom: 10 }}>3D Scan</div>
      <div className="tagline" style={{ marginBottom: 28 }}>
        Step into the scan ring, hold still, and we’ll lift you straight into print-ready 3D.
      </div>

      {/* How it works — three steps */}
      <div className="row gap-20" style={{ marginBottom: 36 }}>
        {[
          { n: '1', t: 'Pick a type', d: 'Choose what we\u2019re scanning you into.' },
          { n: '2', t: 'Hold still', d: '12 cameras snap a 360° pass.' },
          { n: '3', t: 'Pick up later', d: 'Printed and ready in 45\u201390 mins.' },
        ].map((s) => (
          <div key={s.n} className="bubble-card flat" style={{
            '--card-color': '#ffffff', borderRadius: 28, padding: '20px 22px',
            flex: 1, display: 'flex', gap: 16, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#34D374', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 30, flexShrink: 0,
              boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15), 0 4px 0 #1f8a47',
            }}>{s.n}</div>
            <div className="col" style={{ gap: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 26, color: '#2a1a2e' }}>{s.t}</div>
              <div style={{ fontWeight: 500, fontSize: 18, color: 'rgba(42,26,46,0.7)', lineHeight: 1.3 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="h3" style={{ marginBottom: 20 }}>What are we scanning today?</div>

      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'minmax(0, 540px)',
        alignContent: 'center',
        gap: 28,
      }}>
        {SCAN_TYPES.map((it, i) => (
          <ScanTypeCard
            key={it.key}
            item={it}
            cardRef={(el) => { cardRefs.current[i] = el; }}
            shape={tweaks.cardShape}
            ripple={tweaks.fxRipple}
            wobble={tweaks.fxWobble}
            peel={tweaks.fxPeel}
            lip={tweaks.cardLip !== false}
            onTap={() => nav.go('scan-camera', { type: it })}
          />
        ))}
      </div>
    </>
  );
}

// ─── Live camera preview (scanner) ────────────────────────────────────────
function ScanCameraScreen({ type, tweaks }) {
  const nav = useNav();
  const safeType = type || SCAN_TYPES[0];
  const Ico = safeType.icon || ScanIcon;
  const [phase, setPhase] = React.useState('ready'); // ready -> scanning -> done
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    if (phase !== 'scanning') return;
    let id;
    const start = Date.now();
    const tick = () => {
      const d = Date.now() - start;
      setT(Math.min(100, (d / 6000) * 100));
      if (d < 6000) id = requestAnimationFrame(tick);
      else setPhase('done');
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  return (
    <>
      <ScreenHeader />
      <div className="h1" style={{ marginBottom: 10 }}>
        Scan: {safeType.label}
      </div>
      <div className="tagline" style={{ marginBottom: 24 }}>
        {phase === 'ready' && 'Stand in the center of the ring. Tap Start when you\u2019re set.'}
        {phase === 'scanning' && 'Hold very still — eyes forward, arms relaxed.'}
        {phase === 'done' && 'All set! Your scan is on its way to the print queue.'}
      </div>

      {/* Big viewfinder */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="viewfinder" style={{ flex: 1 }}>
          <div className="viewfinder-corner tl" />
          <div className="viewfinder-corner tr" />
          <div className="viewfinder-corner bl" />
          <div className="viewfinder-corner br" />

          {/* Silhouette overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 320, height: 600, borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
              background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
              border: '2px dashed rgba(255,255,255,0.45)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 60,
            }}>
              <Ico size={140} stroke={4} color="rgba(255,255,255,0.85)" />
            </div>
          </div>

          {/* Camera dots around ring */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(a) * 44;
            const y = 50 + Math.sin(a) * 44;
            const active = phase === 'scanning' && ((Date.now()/120 | 0) + i) % 12 === 0;
            return (
              <div key={i} style={{
                position: 'absolute', left: x + '%', top: y + '%',
                width: 14, height: 14, borderRadius: '50%',
                background: phase === 'scanning' ? '#34D374' : 'rgba(255,255,255,0.4)',
                boxShadow: phase === 'scanning'
                  ? '0 0 14px #34D374, 0 0 28px rgba(52,211,116,0.5)'
                  : 'none',
                transform: 'translate(-50%, -50%)',
              }} />
            );
          })}

          {/* Status pill */}
          <div style={{
            position: 'absolute', top: 28, left: 28,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 18px', background: 'rgba(0,0,0,0.55)',
            color: 'white', borderRadius: 999, fontWeight: 600, fontSize: 22,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: phase === 'scanning' ? '#FF5C5C' : '#34D374',
              boxShadow: phase === 'scanning'
                ? '0 0 10px #FF5C5C'
                : '0 0 10px #34D374',
              animation: phase === 'scanning' ? 'pulse 1s infinite' : 'none',
            }} />
            {phase === 'ready' && 'READY'}
            {phase === 'scanning' && `SCANNING · ${Math.round(t)}%`}
            {phase === 'done' && 'CAPTURED'}
          </div>
        </div>

        {/* progress bar */}
        {phase === 'scanning' && (
          <div style={{ height: 14, borderRadius: 999, background: 'rgba(0,0,0,0.1)', marginTop: 20, overflow: 'hidden' }}>
            <div style={{
              width: t + '%', height: '100%',
              background: 'linear-gradient(90deg, #34D374, #6FE89A)',
              boxShadow: '0 0 18px rgba(52,211,116,0.5)',
              transition: 'width 100ms linear',
            }} />
          </div>
        )}

        {/* CTA */}
        <div className="row gap-24" style={{ marginTop: 28, justifyContent: 'center' }}>
          {phase === 'ready' && (
            <Tap as="button" className="btn primary lg" ripple wobble={tweaks.fxWobble}
                 onTap={() => setPhase('scanning')}>
              Start scan
            </Tap>
          )}
          {phase === 'scanning' && (
            <Tap as="button" className="btn lg" ripple
                 onTap={() => { setPhase('ready'); setT(0); }}>
              Cancel
            </Tap>
          )}
          {phase === 'done' && (
            <>
              <Tap as="button" className="btn lg" ripple
                   onTap={() => { setPhase('ready'); setT(0); }}>
                Retake
              </Tap>
              <Tap as="button" className="btn primary lg" ripple wobble={tweaks.fxWobble}
                   onTap={() => nav.reset('menu')}>
                Send to print →
              </Tap>
            </>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ScanHubScreen, ScanCameraScreen, SCAN_TYPES });
