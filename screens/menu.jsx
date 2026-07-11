// menu.jsx — main menu (4 colored bubble cards)

const MENU_ITEMS = [
  {
    key: 'info', label: 'Information', sub: 'About us, FAQ & more',
    icon: InfoIcon,
    color: '#FFC857', shadow: '#c69737',
  },
  {
    key: 'scan', label: '3D Scan', sub: 'Scan yourself into 3D',
    icon: ScanIcon,
    color: '#6DCFF6', shadow: '#3d99c0',
  },
  {
    key: 'photo', label: 'Photo Booth', sub: 'Snap, filter, print',
    icon: CameraIcon,
    color: '#FF8FB8', shadow: '#c2557e',
  },
  {
    key: 'directory', label: 'Directory', sub: 'Models & pride flags',
    icon: DirectoryIcon,
    color: '#7EE787', shadow: '#3fa047',
  },
];

function MenuCard({ item, shape, ripple, wobble, peel, lip, onTap, cardRef }) {
  const Ico = item.icon;
  return (
    // ShapedCard wraps the silhouette shadow + masked surface; the wrapper
    // carries press/peel/wobble so shadow + outline scale with the surface.
    // Content is laid out centered in the wide middle of every silhouette.
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
        padding: '60px 64px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        textAlign: 'center',
      }}
    >
        <div className="icon-plate" style={{
          position: 'relative', zIndex: 1,
          width: 148, height: 148, borderRadius: 999,
        }}>
          <Ico size={92} stroke={5.4} color="#2a1a2e" />
        </div>

        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', gap: 6,
          alignItems: 'center',
        }}>
          <div style={{
            fontFamily: 'Fredoka', fontWeight: 700, fontSize: 46,
            lineHeight: 0.95, color: '#2a1a2e',
            textShadow: '0 2px 0 rgba(255,255,255,0.45)',
            whiteSpace: 'nowrap',
          }}>{item.label}</div>
          <div style={{
            fontFamily: 'Fredoka', fontWeight: 500, fontSize: 22,
            color: 'rgba(42,26,46,0.72)',
            whiteSpace: 'nowrap',
          }}>{item.sub}</div>
        </div>
    </ShapedCard>
  );
}

function MenuScreen({ tweaks }) {
  const nav = useNav();
  const cardRefs = React.useRef([]);
  const logoRef = React.useRef(null);

  // Feed a LIVE skirt field to the Mercury shader for the 4 cards + the logo.
  useSkirtField({
    cardRefs,
    logoRef,
    shape: tweaks.cardShape,
    cardSpread: tweaks.skirtSpread ?? 6,
    logoSpread: tweaks.logoSkirtSpread ?? 6,
  });

  return (
    <>
      {/* Big header with logo */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: 36,
      }}>
        <img src="assets/logo.png" alt="Field of Green Prints"
          ref={logoRef}
          onClick={() => nav.go('play')}
          style={{
            width: 'min(720px, 90%)',
            height: 'auto',
            filter: 'drop-shadow(0 10px 18px rgba(193, 66, 117, 0.25))',
            userSelect: 'none', cursor: 'pointer',
          }} />
        <div style={{
          marginTop: -12,
          fontFamily: 'Fredoka', fontWeight: 600, fontSize: 32,
          color: 'rgba(42,26,46,0.7)', letterSpacing: 0.5,
          textShadow: '0 1px 0 rgba(255,255,255,0.4)',
        }}>
          Welcome — what would you like to do?
        </div>
      </div>

      {/* 2×2 menu grid */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 40,
      }}>
        {MENU_ITEMS.map((it, i) => (
          <MenuCard
            key={it.key}
            item={it}
            cardRef={(el) => { cardRefs.current[i] = el; }}
            shape={tweaks.cardShape}
            ripple={tweaks.fxRipple}
            wobble={tweaks.fxWobble}
            peel={tweaks.fxPeel}
            lip={tweaks.cardLip !== false}
            onTap={() => nav.go(it.key)}
          />
        ))}
      </div>

      {/* footer hint */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, marginTop: 32,
        fontFamily: 'Fredoka', fontWeight: 500, fontSize: 22,
        color: 'rgba(42,26,46,0.55)',
        textShadow: '0 1px 0 rgba(255,255,255,0.35)',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%',
                       background: '#34D374', boxShadow: '0 0 12px #34D374' }} />
        Booth online · tap a card to get started
      </div>
    </>
  );
}

Object.assign(window, { MenuScreen, MENU_ITEMS });
