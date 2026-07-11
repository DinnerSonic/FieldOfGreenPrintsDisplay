// fx.jsx — tap feedback wrapper, screen transitions, navigation helpers

// ─── Last tap point (in % within the kiosk screen) ────────────────────────
// Used by the screen-stack to radiate transitions from where the finger
// actually landed. Defaults to dead-center for programmatic navigations.
let lastTapPt = { x: 50, y: 50 };
function recordTapPoint(clientX, clientY) {
  const screen = document.querySelector('.kiosk-screen');
  if (!screen) return;
  const r = screen.getBoundingClientRect();
  if (!r.width || !r.height) return;
  lastTapPt = {
    x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width)  * 100)),
    y: Math.max(0, Math.min(100, ((clientY - r.top)  / r.height) * 100)),
  };
}

// ─── Tap: scale + ripple + optional wobble ────────────────────────────────
function Tap({
  as: Tag = 'div',
  className = '',
  children,
  onTap,
  ripple = true,
  wobble = false,
  peel = false,
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  const [ripples, setRipples] = React.useState([]);
  const [wobbling, setWobbling] = React.useState(false);

  function handleDown(e) {
    const pt = e.touches ? e.touches[0] : e;
    // Always record the tap point so screen transitions can radiate from
    // the finger — even on Taps that have ripple disabled.
    recordTapPoint(pt.clientX, pt.clientY);
    if (!ripple) return;
    const rect = ref.current.getBoundingClientRect();
    const x = pt.clientX - rect.left;
    const y = pt.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 0.6;
    const id = Math.random().toString(36).slice(2);
    setRipples((r) => [...r, { id, x, y, size }]);
    setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 700);
  }

  function handleUp(e) {
    if (wobble) {
      setWobbling(true);
      setTimeout(() => setWobbling(false), 540);
    }
    if (onTap) onTap(e);
  }

  const cls = [
    'tap',
    wobble ? 'wobble-on' : '',
    wobbling ? 'wobbling' : '',
    peel ? 'peel' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag
      ref={ref}
      className={cls}
      onPointerDown={handleDown}
      onClick={handleUp}
      style={style}
      {...rest}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </Tag>
  );
}

// ─── Screen stack / router ────────────────────────────────────────────────
const NavCtx = React.createContext(null);
const TweaksCtx = React.createContext({});

function useNav() { return React.useContext(NavCtx); }
function useTweaksCtx() { return React.useContext(TweaksCtx); }

function ScreenStack({ initial, screens, tweaks }) {
  // history: stack of { key, props, origin }
  const [history, setHistory] = React.useState([
    { key: initial, props: {}, origin: { x: 50, y: 50 } },
  ]);
  // exiting: { key, props, origin, dir, id } — the screen animating out
  const [exiting, setExiting] = React.useState(null);
  // The direction the CURRENT top screen entered with. Kept in its own
  // state slot so it stays stable after `exiting` is cleared — otherwise
  // the top screen's class would flip from dir-back → dir-forward when
  // the exit animation ends, retriggering its entry keyframes.
  const [enterDir, setEnterDir] = React.useState('forward');

  const top = history[history.length - 1];
  const transition = tweaks?.transition || 'iris';

  const nav = React.useMemo(() => ({
    go(key, props = {}) {
      const origin = { ...lastTapPt };
      const cur = history[history.length - 1];
      setEnterDir('forward');
      setExiting({ ...cur, dir: 'forward', origin, id: Math.random() });
      setHistory((h) => [...h, { key, props, origin }]);
    },
    back() {
      if (history.length <= 1) return;
      const origin = { ...lastTapPt };
      const cur = history[history.length - 1];
      setEnterDir('back');
      setExiting({ ...cur, dir: 'back', origin, id: Math.random() });
      setHistory((h) => h.slice(0, -1));
    },
    reset(key = initial) {
      setExiting(null);
      setEnterDir('forward');
      setHistory([{ key, props: {}, origin: { x: 50, y: 50 } }]);
    },
    canBack: history.length > 1,
    depth: history.length,
  }), [history, initial]);

  // Cleanup safeguard: even if animationend never fires (e.g. element was
  // unmounted, or no animation matched the active preset), drop the
  // exiting screen after a generous timeout so nav stays unblocked.
  React.useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => {
      setExiting((cur) => (cur && cur.id === exiting.id ? null : cur));
    }, 900);
    return () => clearTimeout(t);
  }, [exiting]);

  // External debug-nav hook (used by Tweaks "quick jump")
  React.useEffect(() => {
    const onNav = (e) => nav.reset(e.detail.key);
    window.addEventListener('kiosk:nav', onNav);
    return () => window.removeEventListener('kiosk:nav', onNav);
  }, [nav]);

  const TopComp = screens[top.key];
  // Use the stable enterDir, not exiting.dir, so the class doesn't flip
  // back to dir-forward the moment the exit animation completes.
  const dir = enterDir;
  // On forward, the new screen radiates from the tap point.
  // On back, the new (revealed) screen uses ITS original entry origin.
  const enterOrigin = top.origin || { x: 50, y: 50 };
  const exitOrigin  = exiting?.origin || { x: 50, y: 50 };

  return (
    <NavCtx.Provider value={nav}>
    <TweaksCtx.Provider value={tweaks || {}}>
      <div className={`screen-stack tx-${transition}`} id="screen-stack">
        {exiting && screens[exiting.key] && (
          <div
            key={'exit-' + exiting.id}
            className={`screen screen-exit dir-${exiting.dir}`}
            data-screen={exiting.key}
            data-screen-label={exiting.key}
            style={{ '--ox': exitOrigin.x + '%', '--oy': exitOrigin.y + '%' }}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) {
                setExiting((cur) => (cur && cur.id === exiting.id ? null : cur));
              }
            }}
          >
            {React.createElement(screens[exiting.key], { ...exiting.props, tweaks })}
          </div>
        )}
        <div
          key={'top-' + history.length + '-' + top.key}
          className={`screen screen-enter dir-${dir}`}
          data-screen={top.key}
          data-screen-label={top.key}
          style={{ '--ox': enterOrigin.x + '%', '--oy': enterOrigin.y + '%' }}
          onAnimationEnd={(e) => {
            // On Forward the exit layer is static (no animation), so we
            // need to clear it when the ENTERING layer finishes. On Back
            // the entering layer is static — this handler simply won't fire.
            if (e.target === e.currentTarget && exiting) {
              setExiting((cur) => (cur && cur.id === exiting.id ? null : cur));
            }
          }}
        >
          {TopComp && React.createElement(TopComp, { ...top.props, tweaks })}
        </div>
      </div>
    </TweaksCtx.Provider>
    </NavCtx.Provider>
  );
}

// ─── BackButton ───────────────────────────────────────────────────────────
// A shaped silhouette button (same SVG-masked surface + shadow + gloss as the
// menu cards). When ScreenHeader passes a cardRef, its silhouette is also fed
// to the skirt compositor so a risen-liquid skirt hugs it like the cards.
function BackButton({ onTap, label, cardRef, tweaks }) {
  const nav = useNav();
  const ctx = useTweaksCtx();
  const t = tweaks || ctx || {};
  return (
    <ShapedCard
      cardRef={cardRef}
      shape={t.cardShape || 'sticker'}
      color="#ffffff"
      shadow="#c6a7b8"
      lip={t.cardLip !== false}
      ripple={t.fxRipple !== false}
      wobble
      peel={t.fxPeel}
      onTap={(e) => { if (onTap) onTap(e); else nav.back(); }}
      style={{ width: 92, height: 92, flex: '0 0 auto' }}
      contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}
           aria-label={label || 'Back'}>
        <BackIcon size={46} stroke={5} color="#2a1a2e" />
      </div>
    </ShapedCard>
  );
}

// ─── ScreenHeader: brand + back ───────────────────────────────────────────
// Registers its own skirt source so BOTH the shaped back button and the small
// brand wordmark grow a liquid skirt (the logo's traced from its PNG alpha,
// the back button's from the current card silhouette) — matching the main menu.
function ScreenHeader({ showBrand = true, showBack = true, right, brandSize = 'sm', tweaks }) {
  const ctx = useTweaksCtx();
  const t = tweaks || ctx || {};
  const cardRefs = React.useRef([]);
  const logoRef = React.useRef(null);
  useSkirtField({
    cardRefs,
    logoRef: showBrand ? logoRef : null,
    shape: t.cardShape || 'sticker',
    cardSpread: t.skirtSpread ?? 6,
    logoSpread: t.logoSkirtSpread ?? 4,
  });
  return (
    <div className="brand-header">
      <div style={{ width: 92, display: 'flex' }}>
        {showBack && <BackButton tweaks={t}
          cardRef={(el) => { cardRefs.current[0] = el; }} />}
      </div>
      {showBrand && (
        <img src="assets/logo.png" alt="Field of Green Prints"
             ref={logoRef}
             className={'brand-logo ' + brandSize} />
      )}
      <div style={{ width: 92, display: 'flex', justifyContent: 'flex-end' }}>
        {right}
      </div>
    </div>
  );
}

Object.assign(window, { Tap, ScreenStack, useNav, useTweaksCtx, BackButton, ScreenHeader });
