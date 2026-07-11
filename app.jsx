// app.jsx — root app: kiosk frame, screen stack, tweaks

const SCREENS = {
  'menu':         MenuScreen,
  'info':         InfoHubScreen,
  'info-detail':  InfoDetailScreen,
  'scan':         ScanHubScreen,
  'scan-camera':  ScanCameraScreen,
  'photo':        PhotoIntroScreen,
  'photo-capture':PhotoCaptureScreen,
  'photo-grid':   PhotoGridScreen,
  'photo-edit':   PhotoEditScreen,
  'directory':    DirectoryHubScreen,
  'dir-models':   DirectoryModelsScreen,
  'dir-flags':    DirectoryFlagsScreen,
  'play':         PlayScreen,
};

// ── Mercury shader background ────────────────────────────────────────────
// Liquid-chrome canvas that lives behind the whole screen stack. It only
// shows through screens that are transparent (the menu) — opaque screens
// paint their own pink wallpaper over it.
function MercuryBackground({ tint, finish, snake, merge, mode, drag }) {
  const ref = React.useRef(null);
  const handleRef = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.mountMercury) return;
    const handle = window.mountMercury(ref.current);
    handleRef.current = handle;
    ref.current.__mercury = handle;
    return () => { handleRef.current = null; handle && handle.destroy && handle.destroy(); };
  }, []);
  React.useEffect(() => {
    const h = handleRef.current;
    if (h && h.setTint) h.setTint(tint);
  }, [tint]);
  React.useEffect(() => {
    const h = handleRef.current;
    if (h && h.setFinish) h.setFinish(finish);
  }, [finish]);
  React.useEffect(() => {
    const h = handleRef.current;
    if (h && h.setSnake) h.setSnake(snake);
  }, [snake]);
  React.useEffect(() => {
    const h = handleRef.current;
    if (h && h.setSkirtMerge) h.setSkirtMerge(merge);
  }, [merge]);
  React.useEffect(() => {
    const h = handleRef.current;
    if (h && h.setSkirtMode) h.setSkirtMode(mode);
  }, [mode]);
  React.useEffect(() => {
    const h = handleRef.current;
    if (h && h.setDrag) h.setDrag(drag);
  }, [drag]);
  return <canvas className="mercury-bg" ref={ref} />;
}

// ── Kiosk frame with scale-to-fit ───────────────────────────────────────
function KioskFrame({ children, bgTint, bgFinish, bgSnake, bgMerge, bgMode, bgDrag }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    function fit() {
      if (!ref.current) return;
      const W = 2048 + 72;   // bezel padding
      const H = 1536 + 72;
      const margin = 40;
      const s = Math.min(
        (window.innerWidth - margin) / W,
        (window.innerHeight - margin) / H,
      );
      ref.current.style.transform = `scale(${s})`;
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="kiosk-bezel" ref={ref}>
      <div className="kiosk-screen">
        <MercuryBackground tint={bgTint} finish={bgFinish} snake={bgSnake} merge={bgMerge} mode={bgMode} drag={bgDrag} />
        {children}
      </div>
    </div>
  );
}

// ── App root ────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  // Apply backgrounds via CSS vars on the kiosk screen
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', tweaks.bgColor);
  }, [tweaks.bgColor]);

  // Swap the button surface texture via CSS var
  React.useEffect(() => {
    const TEXTURES = {
      smoky:  'url("assets/button-texture.png")',
      bright: 'url("assets/button-texture-2.png")',
      wispy:  'url("assets/button-texture-3.png")',
      none:   'none',
    };
    document.documentElement.style.setProperty(
      '--btn-tex', TEXTURES[tweaks.buttonTexture] || TEXTURES.smoky);
  }, [tweaks.buttonTexture]);

  return (
    <>
      <KioskFrame bgTint={tweaks.bgColor} bgFinish={tweaks.finish} bgSnake={tweaks.snake} bgMerge={(tweaks.skirtMerge ?? 70) / 100} bgMode={tweaks.skirtStyle ?? 'current'} bgDrag={tweaks.bgDrag !== false}>
        <ScreenStack
          initial="menu"
          screens={SCREENS}
          tweaks={tweaks}
        />
      </KioskFrame>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Screen transition" />
        <TweakSelect
          label="Style"
          value={tweaks.transition}
          options={[
            { value: 'iris',  label: 'Iris — clip from tap point' },
            { value: 'bloom', label: 'Bloom — scale from tap point' },
            { value: 'push',  label: 'Push — directional slide' },
            { value: 'fade',  label: 'Fade — soft crossfade' },
          ]}
          onChange={(v) => setTweak('transition', v)}
        />

        <TweakSection label="Card shape" />
        <TweakSelect
          label="Menu shape"
          value={tweaks.cardShape}
          options={Object.keys(window.SHAPES || {}).map((k) => ({
            value: k, label: window.SHAPES[k].label,
          }))}
          onChange={(v) => setTweak('cardShape', v)}
        />

        <TweakSection label="Button texture" />
        <TweakSelect
          label="Surface"
          value={tweaks.buttonTexture}
          options={[
            { value: 'smoky',  label: 'Smoky marble' },
            { value: 'bright', label: 'Bright marble' },
            { value: 'wispy',  label: 'Wispy marble' },
            { value: 'none',   label: 'None — solid color' },
          ]}
          onChange={(v) => setTweak('buttonTexture', v)}
        />

        <TweakSection label="Tap feedback" />
        <TweakToggle label="Ripple from tap"   value={tweaks.fxRipple}
          onChange={(v) => setTweak('fxRipple', v)} />
        <TweakToggle label="Wobble (sticker)"  value={tweaks.fxWobble}
          onChange={(v) => setTweak('fxWobble', v)} />
        <TweakToggle label="3D peel on press"  value={tweaks.fxPeel}
          onChange={(v) => setTweak('fxPeel', v)} />

        <TweakSection label="Liquid background" />
        <TweakSelect
          label="Finish"
          value={tweaks.finish}
          options={[
            { value: 'milk',  label: 'Strawberry milk — creamy' },
            { value: 'matte', label: 'Matte paint — soft & flat' },
            { value: 'gloss', label: 'Glossy — wet sheen' },
          ]}
          onChange={(v) => setTweak('finish', v)}
        />
        <TweakColor
          label="Color"
          value={tweaks.bgColor}
          options={['#FFD9E3', '#FFE9F0', '#FFC9D9', '#FCE5C1', '#E4F4D8', '#D7E9FF']}
          onChange={(v) => setTweak('bgColor', v)}
        />
        <TweakToggle
          label="Snake mode (liquid trail follows touch)"
          value={tweaks.snake}
          onChange={(v) => setTweak('snake', v)}
        />
        <TweakToggle
          label="Drag trail on background"
          value={tweaks.bgDrag !== false}
          onChange={(v) => setTweak('bgDrag', v)}
        />
        <TweakSlider
          label="Card skirt spread"
          value={tweaks.skirtSpread}
          min={0} max={10} step={1} unit="px"
          onChange={(v) => setTweak('skirtSpread', v)}
        />
        <TweakSlider
          label="Wave merge into skirt"
          value={tweaks.skirtMerge ?? 70}
          min={0} max={100} step={5} unit="%"
          onChange={(v) => setTweak('skirtMerge', v)}
        />
        <TweakSelect
          label="Skirt × wave style"
          value={tweaks.skirtStyle ?? 'current'}
          options={[
            { value: 'current', label: 'Current — sculpted meniscus' },
            { value: 'tide',    label: 'Tide — liquid washes over the lip' },
            { value: 'flow',    label: 'Flow — ridge outline ripples' },
            { value: 'swell',   label: 'Swell — broad soft mound' },
          ]}
          onChange={(v) => setTweak('skirtStyle', v)}
        />
        <TweakToggle
          label="Card lip (sticker shadow)"
          value={tweaks.cardLip !== false}
          onChange={(v) => setTweak('cardLip', v)}
        />
        <TweakSlider
          label="Logo skirt spread"
          value={tweaks.logoSkirtSpread}
          min={0} max={10} step={1} unit="px"
          onChange={(v) => setTweak('logoSkirtSpread', v)}
        />

        <TweakSection label="Quick jump" />
        <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
          {Object.keys(SCREENS).map((k) => (
            <button key={k} className="twk-btn secondary"
              style={{ height: 'auto', padding: '4px 8px', fontSize: 10 }}
              onClick={() => {
                // Use postMessage-less direct: trigger nav via custom event
                window.dispatchEvent(new CustomEvent('kiosk:nav', { detail: { key: k } }));
              }}>
              {k}
            </button>
          ))}
        </div>
      </TweaksPanel>
    </>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
