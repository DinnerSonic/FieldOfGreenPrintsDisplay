// icons.jsx — outlined, chunky friendly icons
// All icons accept { size, color, stroke } and render at viewBox 64x64.

const Icon = ({ size = 64, color = 'currentColor', stroke = 4, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
       stroke={color} strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round"
       style={{ display: 'block', ...(style || {}) }}>
    {children}
  </svg>
);

const InfoIcon = (p) => (
  <Icon {...p}>
    <circle cx="32" cy="32" r="24" />
    <circle cx="32" cy="20" r="2.4" fill={p.color || 'currentColor'} />
    <path d="M32 30 V46" />
  </Icon>
);

const ScanIcon = (p) => (
  <Icon {...p}>
    {/* corner brackets */}
    <path d="M12 22 V14 H20" />
    <path d="M52 22 V14 H44" />
    <path d="M12 42 V50 H20" />
    <path d="M52 42 V50 H44" />
    {/* cube */}
    <path d="M32 20 L44 26 V40 L32 46 L20 40 V26 Z" />
    <path d="M20 26 L32 32 L44 26" />
    <path d="M32 32 V46" />
  </Icon>
);

const CameraIcon = (p) => (
  <Icon {...p}>
    <path d="M8 22 H18 L22 14 H42 L46 22 H56 V50 H8 Z" />
    <circle cx="32" cy="35" r="9" />
    <circle cx="50" cy="26" r="1.5" fill={p.color || 'currentColor'} />
  </Icon>
);

const DirectoryIcon = (p) => (
  <Icon {...p}>
    <path d="M12 14 H46 L52 20 V52 H12 Z" />
    <path d="M20 24 H44" />
    <path d="M20 34 H44" />
    <path d="M20 44 H36" />
    {/* bookmark */}
    <path d="M40 14 V28 L46 24 L52 28 V20" />
  </Icon>
);

const BackIcon = (p) => (
  <Icon {...p}>
    <path d="M40 14 L20 32 L40 50" />
  </Icon>
);

const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M16 16 L48 48" />
    <path d="M48 16 L16 48" />
  </Icon>
);

const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="M14 32 L28 46 L52 18" />
  </Icon>
);

const ChevronRight = (p) => (
  <Icon {...p}>
    <path d="M22 14 L42 32 L22 50" />
  </Icon>
);

const FlagIcon = (p) => (
  <Icon {...p}>
    <path d="M16 8 V60" />
    <path d="M16 12 H52 L46 22 L52 32 H16" />
  </Icon>
);

const FigurineIcon = (p) => (
  <Icon {...p}>
    {/* head */}
    <circle cx="32" cy="16" r="6" />
    {/* body */}
    <path d="M32 22 V36" />
    <path d="M20 28 L32 34 L44 28" />
    {/* legs */}
    <path d="M32 36 L24 54" />
    <path d="M32 36 L40 54" />
  </Icon>
);

const FidgetIcon = (p) => (
  <Icon {...p}>
    <circle cx="32" cy="32" r="6" />
    <circle cx="32" cy="14" r="6" />
    <circle cx="48" cy="40" r="6" />
    <circle cx="16" cy="40" r="6" />
    <path d="M32 20 L32 26" />
    <path d="M37 34 L43 38" />
    <path d="M27 34 L21 38" />
  </Icon>
);

const BobbleIcon = (p) => (
  <Icon {...p}>
    <circle cx="32" cy="18" r="11" />
    <circle cx="28" cy="17" r="1.5" fill={p.color || 'currentColor'} />
    <circle cx="36" cy="17" r="1.5" fill={p.color || 'currentColor'} />
    <path d="M28 22 Q32 25 36 22" />
    <path d="M22 38 H42 L44 56 H20 Z" />
  </Icon>
);

const SparkleIcon = (p) => (
  <Icon {...p}>
    <path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28 Z" />
  </Icon>
);

const FilterIcon = (p) => (
  <Icon {...p}>
    <circle cx="24" cy="26" r="14" />
    <circle cx="40" cy="38" r="14" />
  </Icon>
);

const StickerIcon = (p) => (
  <Icon {...p}>
    <path d="M32 8 L40 20 L54 22 L44 32 L46 46 L32 40 L18 46 L20 32 L10 22 L24 20 Z" />
  </Icon>
);

const HelpIcon = (p) => (
  <Icon {...p}>
    <circle cx="32" cy="32" r="24" />
    <path d="M24 24 Q24 16 32 16 Q40 16 40 24 Q40 30 32 34 V40" />
    <circle cx="32" cy="48" r="2.4" fill={p.color || 'currentColor'} />
  </Icon>
);

const MailIcon = (p) => (
  <Icon {...p}>
    <path d="M8 18 H56 V48 H8 Z" />
    <path d="M8 18 L32 36 L56 18" />
  </Icon>
);

const BoxIcon = (p) => (
  <Icon {...p}>
    <path d="M8 22 L32 12 L56 22 V46 L32 56 L8 46 Z" />
    <path d="M8 22 L32 32 L56 22" />
    <path d="M32 32 V56" />
  </Icon>
);

const HeartIcon = (p) => (
  <Icon {...p}>
    <path d="M32 52 C16 42 8 32 8 22 C8 14 14 8 22 8 C26 8 30 10 32 14 C34 10 38 8 42 8 C50 8 56 14 56 22 C56 32 48 42 32 52 Z" />
  </Icon>
);

const PrintIcon = (p) => (
  <Icon {...p}>
    <path d="M16 24 H48 V44 H16 Z" />
    <path d="M20 24 V14 H44 V24" />
    <path d="M20 44 V54 H44 V44" />
    <circle cx="42" cy="32" r="1.8" fill={p.color || 'currentColor'} />
  </Icon>
);

const TakePhotoIcon = (p) => (
  <Icon {...p}>
    <circle cx="32" cy="32" r="20" />
    <circle cx="32" cy="32" r="13" />
  </Icon>
);

Object.assign(window, {
  Icon, InfoIcon, ScanIcon, CameraIcon, DirectoryIcon,
  BackIcon, CloseIcon, CheckIcon, ChevronRight, FlagIcon,
  FigurineIcon, FidgetIcon, BobbleIcon, SparkleIcon,
  FilterIcon, StickerIcon, HelpIcon, MailIcon, BoxIcon, HeartIcon,
  PrintIcon, TakePhotoIcon,
});
