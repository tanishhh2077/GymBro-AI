import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const SquatIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="4" r="2" />
    <path d="M12 6v4l-3 3v5M12 10l3 3v5" />
    <path d="M5 9h14" />
    <circle cx="5" cy="9" r="1.4" />
    <circle cx="19" cy="9" r="1.4" />
  </svg>
);

export const DeadliftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="9" cy="4" r="2" />
    <path d="M9 6v5l5 2M9 11l-2 7M14 13v5" />
    <path d="M3 20h16" />
    <circle cx="3" cy="20" r="1.3" />
    <circle cx="19" cy="20" r="1.3" />
  </svg>
);

export const BenchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 16h18" />
    <path d="M6 16v3M18 16v3" />
    <circle cx="9" cy="11" r="1.6" />
    <path d="M9 12.5v3.5M9 12.5l4-1M13 8v8" />
    <circle cx="13" cy="8" r="1.2" />
    <circle cx="17" cy="8" r="1.2" />
  </svg>
);

export const UploadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const PlayIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const PauseIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <rect x="7" y="5" width="3.4" height="14" rx="1" />
    <rect x="13.6" y="5" width="3.4" height="14" rx="1" />
  </svg>
);

export const RestartIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4h4" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const AlertIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 9v5M12 17.5v.5" />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);

export const SpinnerIcon = (props: IconProps) => (
  <svg {...base(props)} className={`animate-spin ${props.className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" opacity={0.9} />
  </svg>
);

export const ShieldIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const CpuIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
  </svg>
);
