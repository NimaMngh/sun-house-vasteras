// Line icons drawn for the app, 24×24, stroke = currentColor.

type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const Flame = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.2 1.6 1 2.6 2 3 0-3 .3-5.6.8-8.2z" />
  </svg>
);

export const Thermo = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" />
    <path d="M12 9v6" />
  </svg>
);

export const SunIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);

export const Bolt = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />
  </svg>
);

export const Check = ({ size = 16, className }: P) => (
  <svg {...base(size)} strokeWidth={3} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Lock = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const Bulb = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 17.5h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1v.5h5V16c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </svg>
);

export const Arrow = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const Reset = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5" />
  </svg>
);

export function Star({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`star ${on ? 'star-on' : 'star-off'} ${className ?? ''}`} aria-hidden>
      <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
  );
}

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={`stars ${className ?? ''}`} role="img" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} on={i < count} />
      ))}
    </span>
  );
}

export function HouseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="23" cy="8.5" r="5" fill="#f5b82e" />
      <path d="M3.5 28.5V15.5l9.5-7.5 9.5 7.5v13z" fill="#e2571f" />
      <rect x="9" y="18" width="5" height="5" fill="#fbe5da" />
    </svg>
  );
}
