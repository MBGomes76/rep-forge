import type { SVGProps } from 'react';

/** Icônes SVG (pas d'emoji dans l'interface). Décoratives : masquées aux lecteurs d'écran. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const BackIcon = (p: IconProps) => <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>;
export const ChevronRightIcon = (p: IconProps) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const PlusIcon = (p: IconProps) => <Svg strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: IconProps) => <Svg strokeWidth={2.4} {...p}><path d="M5 12h14" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg strokeWidth={2.6} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const TrashIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </Svg>
);
export const PlayIcon = (p: IconProps) => (
  <Svg fill="currentColor" stroke="none" {...p}>
    <path d="M7 4l13 8-13 8z" />
  </Svg>
);
export const HomeIcon = (p: IconProps) => <Svg strokeWidth={2} {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10" /></Svg>;
export const ProgramsIcon = (p: IconProps) => <Svg strokeWidth={2} {...p}><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" /></Svg>;
export const HistoryIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const ProfileIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Svg>
);
export const ArrowUpIcon = (p: IconProps) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const ArrowDownIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>;
