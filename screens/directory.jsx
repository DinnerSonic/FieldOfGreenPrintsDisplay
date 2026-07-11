// directory.jsx — Directory hub, Print Model placeholder, Pride Flag details

const DIR_ITEMS = [
  { key: 'models', label: 'Print Model Directory', sub: 'Browse what we can print',
    icon: PrintIcon, color: '#A8DCFF', shadow: '#6ba7d0' },
  { key: 'flags',  label: 'Pride Flag Details',    sub: 'Identities & meanings',
    icon: FlagIcon, color: '#FFB6CE', shadow: '#c97da0' },
];

function DirectoryHubScreen({ tweaks }) {
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
      <div className="h1" style={{ marginBottom: 12 }}>Directory</div>
      <div className="tagline" style={{ marginBottom: 40 }}>
        Browse our print catalog or learn about the pride flags we print.
      </div>

      <div className="col gap-32 flex-1">
        {DIR_ITEMS.map((it, i) => {
          const Ico = it.icon;
          return (
            <ShapedCard
              key={it.key}
              cardRef={(el) => { cardRefs.current[i] = el; }}
              shape={tweaks.cardShape}
              color={it.color}
              shadow={it.shadow}
              lip={tweaks.cardLip !== false}
              ripple={tweaks.fxRipple}
              wobble={tweaks.fxWobble}
              peel={tweaks.fxPeel}
              onTap={() => nav.go(it.key === 'models' ? 'dir-models' : 'dir-flags')}
              style={{ flex: 1, minHeight: 0 }}
              contentStyle={{
                padding: 40,
                display: 'flex', alignItems: 'center', gap: 36,
              }}
            >
              <div className="icon-plate" style={{
                position: 'relative', zIndex: 1,
                width: 200, height: 200, borderRadius: 999, flexShrink: 0,
              }}>
                <Ico size={120} stroke={5.2} color="#2a1a2e" />
              </div>
              <div className="col" style={{ position: 'relative', zIndex: 1, flex: 1, gap: 10 }}>
                <div style={{
                  fontWeight: 700, fontSize: 64, lineHeight: 1.0, color: '#2a1a2e',
                  textShadow: '0 2px 0 rgba(255,255,255,0.45)',
                }}>{it.label}</div>
                <div style={{
                  fontWeight: 500, fontSize: 28, color: 'rgba(42,26,46,0.7)',
                }}>{it.sub}</div>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                <ChevronRight size={56} stroke={5.5} color="rgba(42,26,46,0.5)" />
              </div>
            </ShapedCard>
          );
        })}
      </div>
    </>
  );
}

// ─── Print Model placeholder ──────────────────────────────────────────────
function DirectoryModelsScreen() {
  return (
    <>
      <ScreenHeader />
      <div className="h1" style={{ marginBottom: 14 }}>Print Model Directory</div>
      <div className="tagline" style={{ marginBottom: 36 }}>
        A browsable, filterable catalog. Detailed design coming soon.
      </div>

      <div className="bubble-card flat" style={{
        '--card-color': '#ffffff',
        borderRadius: 40, padding: 56,
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
      }}>
        <div className="icon-plate" style={{
          width: 180, height: 180, borderRadius: 999,
          background: '#FFD45B',
        }}>
          <PrintIcon size={108} stroke={5} color="#2a1a2e" />
        </div>
        <div className="h2" style={{ textAlign: 'center' }}>
          Placeholder sub-screen
        </div>
        <div className="body" style={{ textAlign: 'center', maxWidth: 720 }}>
          The Print Model Directory will live here — categories, filters, model previews,
          and an order-to-print flow. We’ll design it out in the next round.
        </div>

        {/* fake category chips for flavor */}
        <div className="row wrap gap-16" style={{ justifyContent: 'center', maxWidth: 720, marginTop: 8 }}>
          {['Figurines', 'Keychains', 'Planters', 'Phone stands', 'Pride pins', 'Brackets', 'Toys', 'Sculptures'].map((c) => (
            <span key={c} className="chip" style={{
              opacity: 0.65, fontSize: 22, padding: '10px 18px',
            }}>{c}</span>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Pride flags ──────────────────────────────────────────────────────────
// Flag colors as horizontal stripes. We build the flag fabric via linear gradient.
const FLAGS = [
  {
    key: 'rainbow', name: 'Rainbow',
    desc: 'The classic LGBTQ+ pride flag, designed by Gilbert Baker in 1978. Six stripes representing life, healing, sunlight, nature, harmony, and spirit.',
    stripes: ['#E50000', '#FF8D00', '#FFEE00', '#028121', '#004CFF', '#770088'],
  },
  {
    key: 'trans', name: 'Transgender',
    desc: 'Designed by Monica Helms in 1999. Blue and pink for traditional baby colors, white for those transitioning or who identify outside the binary.',
    stripes: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
  },
  {
    key: 'bi', name: 'Bisexual',
    desc: 'Created by Michael Page in 1998. Pink for attraction to the same gender, blue for the opposite, purple where they overlap.',
    stripes: ['#D60270', '#D60270', '#9B4F96', '#0038A8', '#0038A8'],
  },
  {
    key: 'lesbian', name: 'Lesbian',
    desc: 'The seven-stripe lesbian flag, with orange tones for community and pink for love and femininity. White represents unique relationships to womanhood.',
    stripes: ['#D52D00', '#EF7627', '#FF9A56', '#FFFFFF', '#D162A4', '#B55690', '#A30262'],
  },
  {
    key: 'pan', name: 'Pansexual',
    desc: 'Pink for those who identify as women, blue for men, yellow for non-binary, agender, and everyone in between.',
    stripes: ['#FF218C', '#FFD800', '#21B1FF'],
  },
  {
    key: 'ace', name: 'Asexual',
    desc: 'Black for asexuality, grey for grey-asexuality, white for allies, purple for community.',
    stripes: ['#000000', '#A4A4A4', '#FFFFFF', '#810081'],
  },
  {
    key: 'nb', name: 'Non-binary',
    desc: 'Designed by Kye Rowan in 2014. Yellow for those outside the binary, white for many genders, purple for combinations, black for no gender.',
    stripes: ['#FCF434', '#FFFFFF', '#9C5CD4', '#2C2C2C'],
  },
  {
    key: 'genderfluid', name: 'Genderfluid',
    desc: 'Created by JJ Poole in 2012. Five stripes for femininity, lack of gender, combination, all genders, and masculinity.',
    stripes: ['#FF76A4', '#FFFFFF', '#C011D7', '#000000', '#2F3CBE'],
  },
  {
    key: 'aro', name: 'Aromantic',
    desc: 'Green for the aromantic spectrum, white for platonic and aesthetic attraction, grey and black for the sexuality spectrum.',
    stripes: ['#3BA740', '#A8D47A', '#FFFFFF', '#AAAAAA', '#000000'],
  },
  {
    key: 'demisex', name: 'Demisexual',
    desc: 'For those who only feel sexual attraction after forming a strong emotional bond. Triangle echoes the asexual flag’s palette.',
    stripes: ['#FFFFFF', '#FFFFFF', '#810081', '#A4A4A4'],
  },
  {
    key: 'intersex', name: 'Intersex',
    desc: 'Designed by Morgan Carpenter in 2013. The circle symbolizes wholeness on a yellow ground that avoids gendered colors.',
    solid: '#FFD800', emblem: { kind: 'ring', color: '#7902AA' },
  },
  {
    key: 'progress', name: 'Progress Pride',
    desc: 'Daniel Quasar’s 2018 redesign adds a chevron of trans, black, and brown stripes pushing the movement forward.',
    stripes: ['#E50000', '#FF8D00', '#FFEE00', '#028121', '#004CFF', '#770088'],
    chevron: ['#FFFFFF', '#F5A9B8', '#5BCEFA', '#613915', '#000000'],
  },
];

function FlagSvg({ flag }) {
  // Render as a 100x60 svg with a flagpole on the left and waving fabric
  const stripes = flag.stripes || [];
  const h = 60;
  return (
    <svg viewBox="0 0 110 70" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`shadow-${flag.key}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* pole */}
      <rect x="5" y="2" width="3" height="66" rx="1.5" fill="#6b4a31" />
      <circle cx="6.5" cy="2" r="2.4" fill="#d4a566" stroke="#8a6431" strokeWidth="0.4" />

      {/* fabric — handled by parent .flag-wave wrapping */}
      <g className="flag-wave" filter={`url(#shadow-${flag.key})`} style={{ transformOrigin: '8px 35px' }}>
        {flag.solid && (
          <rect x="8" y="6" width="98" height={h} fill={flag.solid} />
        )}
        {flag.solid && flag.emblem && flag.emblem.kind === 'ring' && (
          <circle cx="57" cy={6 + h/2} r="14" fill="none"
                  stroke={flag.emblem.color} strokeWidth="4.5" />
        )}
        {!flag.solid && stripes.map((c, i) => (
          <rect key={i}
            x="8" y={6 + (h / stripes.length) * i}
            width="98" height={h / stripes.length} fill={c} />
        ))}
        {flag.chevron && (
          <>
            {/* Chevron clipped on the left edge */}
            <defs>
              <clipPath id={`chev-${flag.key}`}>
                <polygon points={`8,6 48,${6 + h/2} 8,${6 + h}`} />
              </clipPath>
            </defs>
            <g clipPath={`url(#chev-${flag.key})`}>
              {flag.chevron.map((c, i) => (
                <rect key={i}
                  x="8" y={6 + (h / flag.chevron.length) * i}
                  width="98" height={h / flag.chevron.length} fill={c} />
              ))}
            </g>
          </>
        )}
        {/* fabric shine */}
        <rect x="8" y="6" width="98" height={h}
              fill="url(#shine-grad)" opacity="0.35" />
        <defs>
          <linearGradient id="shine-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="white" stopOpacity="0.0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </g>
    </svg>
  );
}

function FlagCard({ flag, tweaks }) {
  return (
    <div className="bubble-card flat" style={{
      '--card-color': '#ffffff',
      borderRadius: 32, padding: 22,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '11 / 7',
        background: 'linear-gradient(180deg, #fff7fb 0%, #ffe9f1 100%)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
      }}>
        <FlagSvg flag={flag} />
        <span className="flag-shimmer" />
      </div>
      <div style={{
        fontWeight: 700, fontSize: 30, color: '#2a1a2e', lineHeight: 1.0,
      }}>{flag.name}</div>
      <div style={{
        fontWeight: 500, fontSize: 19, color: 'rgba(42,26,46,0.7)',
        lineHeight: 1.35,
      }}>{flag.desc}</div>
    </div>
  );
}

function DirectoryFlagsScreen({ tweaks }) {
  return (
    <>
      <ScreenHeader />
      <div className="h1" style={{ marginBottom: 8 }}>Pride Flag Details</div>
      <div className="tagline" style={{ marginBottom: 24 }}>
        Tap any flag in our pin catalog to print it. Here’s what each one means.
      </div>

      <div className="scroll-y flex-1" style={{ paddingRight: 8 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}>
          {FLAGS.map((f) => (
            <FlagCard key={f.key} flag={f} tweaks={tweaks} />
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  DirectoryHubScreen, DirectoryModelsScreen, DirectoryFlagsScreen,
});
