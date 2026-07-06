import React from 'react';

type P = React.SVGProps<SVGSVGElement> & { size?: number };

const I = (paths: React.ReactNode, viewBox = '0 0 24 24') =>
  function Icon({ size = 18, ...rest }: P) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...rest}
      >
        {paths}
      </svg>
    );
  };

export const IcSearch = I(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>);
export const IcCart = I(<><circle cx="9" cy="20" r="1.6" /><circle cx="17.5" cy="20" r="1.6" /><path d="M3 3h2.4l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.3L20.5 7H6" /></>);
export const IcBell = I(<><path d="M18 9a6 6 0 1 0-12 0c0 6-2.4 7-2.4 7h16.8S18 15 18 9" /><path d="M10.2 20a2 2 0 0 0 3.6 0" /></>);
export const IcChevronDown = I(<path d="m6 9 6 6 6-6" />);
export const IcChevronRight = I(<path d="m9 6 6 6-6 6" />);
export const IcCalendar = I(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>);
export const IcMapPin = I(<><path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></>);
export const IcTicket = I(<><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" /><path d="M13 5v2.5M13 11v2M13 16.5V19" strokeDasharray="0.1 3.5" /></>);
export const IcReceipt = I(<><path d="M5 3h14v18l-2.3-1.6L14.4 21l-2.4-1.6L9.6 21l-2.3-1.6L5 21V3Z" /><path d="M9 8h6M9 12h6" /></>);
export const IcSettings = I(<><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></>);
export const IcSignOut = I(<><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="m16 17 5-5-5-5M21 12H9" /></>);
export const IcFeed = I(<><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" /></>);
export const IcImages = I(<><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.8" /><path d="m21 15-4.2-4.2a1.5 1.5 0 0 0-2.1 0L6 19.5" /></>);
export const IcPin = I(<><path d="M12 17v5" /><path d="M8 3h8l-1 7.5 2.5 3a1 1 0 0 1-.8 1.5H7.3a1 1 0 0 1-.8-1.5l2.5-3L8 3Z" /></>);
export const IcHeart = I(<path d="M12 20.7C5.4 16.6 2 12.9 2 9.2 2 6.3 4.2 4 7.1 4c1.9 0 3.7 1 4.9 2.7C13.2 5 15 4 16.9 4 19.8 4 22 6.3 22 9.2c0 3.7-3.4 7.4-10 11.5Z" />);
export const IcShare = I(<><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="m8.4 10.7 7.2-4.2M8.4 13.3l7.2 4.2" /></>);
export const IcDownload = I(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>);
export const IcPlus = I(<path d="M12 5v14M5 12h14" />);
export const IcX = I(<path d="M18 6 6 18M6 6l12 12" />);
export const IcCheck = I(<path d="m4 12.5 5.3 5.3L20 7" />);
export const IcEdit = I(<><path d="M17 3a2.8 2.8 0 0 1 4 4L8.5 19.5 3 21l1.5-5.5L17 3Z" /></>);
export const IcEye = I(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>);
export const IcEyeOff = I(<><path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-2.5 3.4M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="m2 2 20 20" /></>);
export const IcGrid = I(<><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>);
export const IcUser = I(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>);
export const IcSparkles = I(<><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>);
export const IcMusic = I(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>);
export const IcArrowRight = I(<path d="M5 12h14m-6-6 6 6-6 6" />);
export const IcExternal = I(<><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M20 14v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1.5-1.5H10" /></>);
export const IcCamera = I(<><path d="M4 8h2.5l1.8-2.6A1.5 1.5 0 0 1 9.5 4.8h5a1.5 1.5 0 0 1 1.2.6L17.5 8H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="14" r="3.4" /></>);
export const IcLayers = I(<><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></>);
export const IcStar = I(<path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8L12 3Z" />);
export const IcTrash = I(<><path d="M4 7h16" /><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" /><path d="M6.5 7 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13" /><path d="M10 11v6M14 11v6" /></>);
export const IcGrip = I(<><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></>);
export const IcZap = I(<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />);
export const IcFolder = I(<path d="M3 7a2 2 0 0 1 2-2h4l2.3 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />);
export const IcRefresh = I(<><path d="M21 12a9 9 0 1 1-2.6-6.3" /><path d="M21 3v6h-6" /></>);
export const IcCrown = I(<><path d="m3 8 4.5 3.5L12 5l4.5 6.5L21 8l-1.6 10a1.5 1.5 0 0 1-1.5 1.2H6.1A1.5 1.5 0 0 1 4.6 18L3 8Z" /></>);
export const IcCompass = I(<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>);
export const IcMenu = I(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IcCopy = I(<><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>);
export const IcInfo = I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.1" /></>);
export const IcMaximize = I(<><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></>);
export const IcTag = I(<><path d="M2 12V4a2 2 0 0 1 2-2h8l10 10-10 10L2 12Z" /><circle cx="7.5" cy="7.5" r="1.4" /></>);
export const IcClock = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>);
export const IcLock = I(<><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const IcSwitch = I(<><path d="m7 8 10 0" /><path d="m13 4 4 4-4 4" /><path d="M17 16H7" /><path d="m11 12-4 4 4 4" /></>);
export const IcPlay = I(<path d="M7 4.5v15l12-7.5-12-7.5Z" />);
export const IcPause = I(<><path d="M7.5 4.5v15" /><path d="M16.5 4.5v15" /></>);
