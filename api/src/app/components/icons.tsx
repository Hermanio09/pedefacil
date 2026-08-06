type IconProps = { size?: number; strokeWidth?: number; className?: string };

const base = (size = 20, strokeWidth = 1.8) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconGrid = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" />
  </svg>
);

export const IconBox = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" />
    <path d="M3.5 8v8.5L12 21l8.5-4.5V8" />
    <path d="M12 12.5V21" />
  </svg>
);

export const IconArrowDownCircle = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v7.5" />
    <path d="M8.5 12 12 15.5 15.5 12" />
  </svg>
);

export const IconArrowUpCircle = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 16V8.5" />
    <path d="M8.5 12 12 8.5 15.5 12" />
  </svg>
);

export const IconReceipt = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 3.5h12v17l-2.2-1.4L13.6 20l-1.6-1.4L10.4 20l-2.2-1.4L6 20.5Z" />
    <path d="M9 8h6M9 11.5h6M9 15h4" />
  </svg>
);

export const IconArchive = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3.5" y="4" width="17" height="4.5" rx="1.2" />
    <path d="M4.5 8.5v9a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-9" />
    <path d="M10 12.5h4" />
  </svg>
);

export const IconTruck = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="2.5" y="7" width="11" height="9" rx="1" />
    <path d="M13.5 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.7" />
    <circle cx="16.5" cy="18" r="1.7" />
  </svg>
);

export const IconClipboardList = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="5" y="4.5" width="14" height="16" rx="1.8" />
    <rect x="9" y="3" width="6" height="3" rx="1" />
    <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
  </svg>
);

export const IconCheckCircle = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.3 12.3l2.4 2.4 5-5.2" />
  </svg>
);

export const IconCalendar = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.8" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v4M16 3v4" />
    <path d="M7.5 13h3M13.5 13h3M7.5 16.5h3M13.5 16.5h3" />
  </svg>
);

export const IconChartBar = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 20.5V10" />
    <path d="M12 20.5V4" />
    <path d="M20 20.5v-7" />
    <path d="M2.5 20.5h19" />
  </svg>
);

export const IconUsers = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.3 19.5c.7-3.4 3-5.2 5.7-5.2s5 1.8 5.7 5.2" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16 14.6c2.3.3 3.8 1.9 4.3 4.3" />
  </svg>
);

export const IconAlertTriangle = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 9.5v4.5" />
    <circle cx="12" cy="17" r="0.15" fill="currentColor" stroke="none" />
    <path d="M12 17h.01" strokeWidth={strokeWidth ? strokeWidth + 1.4 : 3.2} />
  </svg>
);

export const IconLogout = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M9 20H5.8A1.8 1.8 0 0 1 4 18.2V5.8A1.8 1.8 0 0 1 5.8 4H9" />
    <path d="M16 16.5 20.5 12 16 7.5" />
    <path d="M20.5 12H9" />
  </svg>
);

export const IconMonitor = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="4.5" width="18" height="12" rx="1.6" />
    <path d="M8.5 20.5h7M12 16.5v4" />
  </svg>
);

export const IconSun = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.3M12 19.2v2.3M4.5 12H2.2M21.8 12h-2.3M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
  </svg>
);

export const IconMoon = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.8 6.8 0 0 0 9.5 9.5Z" />
  </svg>
);

export const IconClock = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 2" />
  </svg>
);

export const IconPackagePlus = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" />
    <path d="M3.5 8v8.5L12 21l8.5-4.5V8" />
    <path d="M12 12.5V21" />
  </svg>
);

export const IconWhatsapp = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6.5 17.5 4 20l2.6-.7A8.4 8.4 0 1 0 4 12a8.3 8.3 0 0 0 1.1 4.2Z" />
    <path d="M8.7 9.3c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4.2.5.6 1.5.6 1.6.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1 .2-.2.3-.2.6-.1l1.5.7c.2.1.4.2.4.4 0 .2 0 1-.4 1.4-.3.4-1.2.9-2.4.7-1.3-.3-3.2-1.1-4.7-2.8-1.4-1.6-2-2.8-2.2-3.4-.2-.6-.4-1.4 0-1.9Z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevronDown = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 9.5 12 15.5 18 9.5" />
  </svg>
);

export const IconTrash = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V4.8c0-.4.4-.8.9-.8h4.2c.5 0 .9.4.9.8V7" />
    <path d="M6 7l1 12.2c0 .5.4.8.9.8h8.2c.5 0 .9-.3.9-.8L18 7" />
    <path d="M10 11v5.5M14 11v5.5" />
  </svg>
);

export const IconSearch = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20 15.3 15.3" />
  </svg>
);

export const IconMail = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="1.8" />
    <path d="M3.5 6.5 12 13l8.5-6.5" />
  </svg>
);

export const IconSmartphone = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
    <path d="M11 18.5h2" />
  </svg>
);

export const IconEdit = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M14 8l3 3" />
  </svg>
);

export const IconUser = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.7 20c.9-3.9 3.4-6 7.3-6s6.4 2.1 7.3 6" />
  </svg>
);

export const IconLightbulb = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
  </svg>
);

export const IconInbox = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.5 12.5h5l1.7 2.8h3.6l1.7-2.8h5" />
    <path d="M5.5 5h13l2 7.5v6.3c0 1-.8 1.7-1.7 1.7H5.2c-1 0-1.7-.8-1.7-1.7v-6.3Z" />
  </svg>
);

export const IconRefreshCw = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5" />
    <path d="M20.5 4v4.5H16" />
    <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5" />
    <path d="M3.5 20v-4.5H8" />
  </svg>
);

export const IconRotateCcw = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 4v5.5h5.5" />
    <path d="M4.5 13a7.8 7.8 0 1 0 2.2-6.9L4 9.5" />
  </svg>
);

export const IconFileText = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6.5 3h7l4 4v13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M13.5 3v4h4" />
    <path d="M8.5 12.5h7M8.5 16h5" />
  </svg>
);

export const IconDownload = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3.5v11.5" />
    <path d="M7.5 11 12 15.5 16.5 11" />
    <path d="M4.5 17.5v2.3c0 .7.5 1.2 1.2 1.2h12.6c.7 0 1.2-.5 1.2-1.2v-2.3" />
  </svg>
);

export const IconDollarSign = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 2.5v19" />
    <path d="M16.5 6.5c0-1.7-2-2.7-4.5-2.7S7.5 5 7.5 6.8s1.7 2.5 4.5 3c2.8.5 4.5 1.2 4.5 3s-2 2.9-4.5 2.9-4.5-1-4.5-2.7" />
  </svg>
);

export const IconCamera = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 8.5c0-.8.7-1.5 1.5-1.5h2l1.2-2h6.6l1.2 2h2c.8 0 1.5.7 1.5 1.5V18a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const IconPlus = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 4.5v15M4.5 12h15" />
  </svg>
);

export const IconBell = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.5 5.5 1.5 6.5H4.5C4.5 15 6 14 6 9.5Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

export const IconX = ({ size, strokeWidth, className }: IconProps) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M5 5l14 14M19 5 5 19" />
  </svg>
);
