// play.jsx — "Play Mode!" easter egg.
// Reached by tapping the logo on the main menu. Intentionally near-empty so
// the liquid background is the star: just a small back button and a small
// header. If left idle for 20s, it returns to the main menu on its own.

const PLAY_IDLE_MS = 20000;

function PlayScreen() {
  const nav = useNav();

  React.useEffect(() => {
    let timer = null;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => nav.back(), PLAY_IDLE_MS);
    };
    // Any interaction (tapping/dragging the background to play) resets it.
    const events = ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'keydown'];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [nav]);

  return (
    <>
      {/* Small header: back button on the left, tiny title beside it.
          Everything else is deliberately empty so the shader shows through. */}
      <div className="brand-header" style={{ minHeight: 84, justifyContent: 'flex-start', gap: 18 }}>
        <BackButton />
        <div style={{
          fontFamily: 'Bagel Fat One', fontWeight: 400, fontSize: 30,
          color: '#2a1a2e',
          textShadow: '0 2px 0 rgba(255,255,255,0.45)',
        }}>
          Play Mode!
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PlayScreen });
