// info.jsx — Information hub + detail screens

const INFO_ITEMS = [
  { key: 'about-fgp',    label: 'About Field of Green Prints', icon: HeartIcon,
    color: '#FFB6CE', shadow: '#c97da0', accent: 'About us' },
  { key: 'about-wf',     label: 'About WayForward',            icon: SparkleIcon,
    color: '#A8DCFF', shadow: '#6ba7d0', accent: 'Our parent org' },
  { key: 'faq',          label: 'FAQ',                          icon: HelpIcon,
    color: '#FFD45B', shadow: '#cba23a', accent: 'Questions & answers' },
  { key: 'customs',      label: 'Customs',                      icon: BoxIcon,
    color: '#C8B4F2', shadow: '#8d7ac0', accent: 'Custom prints' },
  { key: 'contact',      label: 'Contact',                      icon: MailIcon,
    color: '#9FECC4', shadow: '#5fb389', accent: 'Get in touch' },
];

function InfoRow({ item, shape, ripple, wobble, peel, lip, onTap, cardRef }) {
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
        padding: '30px 40px',
        display: 'flex', alignItems: 'center', gap: 28,
      }}
    >
      <div className="icon-plate" style={{
        position: 'relative', zIndex: 1,
        width: 96, height: 96, borderRadius: 26, flexShrink: 0,
      }}>
        <Ico size={56} stroke={5} color="#2a1a2e" />
      </div>
      <div className="col" style={{ position: 'relative', zIndex: 1, flex: 1, gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 38, lineHeight: 1.1, color: '#2a1a2e' }}>
          {item.label}
        </div>
        <div style={{ fontWeight: 500, fontSize: 22, color: 'rgba(42,26,46,0.65)' }}>
          {item.accent}
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
        <ChevronRight size={48} stroke={5.5} color="rgba(42,26,46,0.45)" />
      </div>
    </ShapedCard>
  );
}

function InfoHubScreen({ tweaks }) {
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
      <div className="h1" style={{ marginBottom: 12 }}>Information</div>
      <div className="tagline" style={{ marginBottom: 40 }}>
        Pick a topic to read more about.
      </div>

      <div className="flex-1 scroll-y" style={{ paddingRight: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignContent: 'start' }}>
        {INFO_ITEMS.map((it, i) => (
          <InfoRow
            key={it.key}
            item={it}
            cardRef={(el) => { cardRefs.current[i] = el; }}
            shape={tweaks.cardShape}
            ripple={tweaks.fxRipple}
            wobble={tweaks.fxWobble}
            peel={tweaks.fxPeel}
            lip={tweaks.cardLip !== false}
            onTap={() => nav.go('info-detail', { item: it })}
          />
        ))}
      </div>
    </>
  );
}

// ─── Detail screen with long scrollable copy ──────────────────────────────
const INFO_COPY = {
  'about-fgp': {
    title: 'About Field of Green Prints',
    body: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
    ],
  },
  'about-wf': {
    title: 'About WayForward',
    body: [
      'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
      'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.',
      'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.',
    ],
  },
  'faq': {
    title: 'Frequently Asked Questions',
    body: [
      'Lorem ipsum dolor sit amet?\nConsectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
      'Quis nostrud exercitation ullamco?\nLaboris nisi ut aliquip ex ea commodo consequat, duis aute irure dolor in reprehenderit in voluptate velit.',
      'Duis aute irure dolor?\nIn reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.',
      'Excepteur sint occaecat cupidatat?\nNon proident, sunt in culpa qui officia deserunt mollit anim id est laborum sed ut perspiciatis.',
      'Sed ut perspiciatis unde omnis?\nIste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa.',
      'Nemo enim ipsam voluptatem?\nQuia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos.',
    ],
  },
  'customs': {
    title: 'Custom Prints',
    body: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    ],
  },
  'contact': {
    title: 'Contact',
    body: [
      'Lorem ipsum dolor sit amet \u00b7 consectetur adipiscing elit',
      'Email: lorem@ipsum.com\nInstagram: @loremipsum\nMastodon: @lorem@ipsum.af',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.',
      'Quis nostrud exercitation: dolor@ipsum.com',
      'Duis aute irure dolor in reprehenderit: info@loremipsum.com',
    ],
  },
};

function InfoDetailScreen({ item, tweaks }) {
  const safeItem = item || INFO_ITEMS[0];
  const copy = INFO_COPY[safeItem.key] || { title: safeItem.label, body: ['Coming soon.'] };
  const ItemIcon = safeItem.icon;
  return (
    <>
      <ScreenHeader />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24,
        width: '100%', maxWidth: 1500, alignSelf: 'center',
      }}>
        <div className="icon-plate" style={{
          width: 96, height: 96, borderRadius: 26,
          background: safeItem.color, flexShrink: 0,
        }}>
          <ItemIcon size={56} stroke={5} color="#2a1a2e" />
        </div>
        <div className="h1" style={{ fontSize: 64, lineHeight: 0.95 }}>{copy.title}</div>
      </div>

      <div className="bubble-card flat" style={{
        '--card-color': '#ffffff',
        borderRadius: 36, padding: '36px 40px',
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: 1500, alignSelf: 'center',
      }}>
        <div className="scroll-y body" style={{
          flex: 1, paddingRight: 16, whiteSpace: 'pre-wrap',
        }}>
          {copy.body.map((p, i) => (
            <p key={i} style={{ marginTop: i === 0 ? 0 : 24 }}>{p}</p>
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { InfoHubScreen, InfoDetailScreen, INFO_ITEMS });
