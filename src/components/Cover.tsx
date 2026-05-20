function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

const PALETTE = [
  "#c43c2a", "#3a5a8a", "#d98a3a", "#1a3a4a", "#2a2030", "#7a3a2a",
  "#4a5a2a", "#3a3a6a", "#5a7a4a", "#6a2a3a", "#2a4a4a", "#5a4a2a",
];

export function Cover({
  url,
  seedKey,
  title,
  publisher,
}: {
  url: string | null;
  seedKey: string;
  title: string;
  publisher?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="block h-full w-full object-cover"
        style={{ aspectRatio: "0.71" }}
      />
    );
  }
  const seed = hashStr(seedKey + title);
  const color = PALETTE[Math.floor(seed * PALETTE.length)];
  const w = 200;
  const h = Math.round(w / 0.71);
  const variant = Math.floor(seed * 3);
  const bandY = 40 + Math.floor(seed * (h - 120));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className="block"
      style={{ aspectRatio: "0.71", background: color }}
    >
      <defs>
        <pattern id={`stripe-${seedKey}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={color} />
          <rect width="6" height="0.5" fill={`rgba(255,255,255,${0.05 + seed * 0.03})`} />
        </pattern>
        <linearGradient id={`grad-${seedKey}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.20)" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#stripe-${seedKey})`} />
      <rect width={w} height={h} fill={`url(#grad-${seedKey})`} />
      <rect x="0" y="0" width="6" height={h} fill={`rgba(255,255,255,${0.04 + seed * 0.04})`} />
      <rect x="6" y="0" width="1" height={h} fill="rgba(0,0,0,0.25)" />
      {variant === 0 && (
        <>
          <rect x="14" y={bandY} width={w - 28} height="2" fill="rgba(232,227,216,0.6)" />
          <rect x="14" y={bandY + 60} width={(w - 28) * 0.6} height="2" fill="rgba(232,227,216,0.4)" />
        </>
      )}
      {variant === 1 && (
        <>
          <circle cx={w / 2} cy={h / 2 - 20} r={w / 4} fill="none" stroke="rgba(232,227,216,0.35)" strokeWidth="1.5" />
          <circle cx={w / 2} cy={h / 2 - 20} r={w / 6} fill="none" stroke="rgba(232,227,216,0.25)" strokeWidth="1" />
        </>
      )}
      {variant === 2 && (
        <>
          <rect x={w * 0.15} y={h * 0.18} width={w * 0.7} height={h * 0.55} fill="none" stroke="rgba(232,227,216,0.3)" strokeWidth="1" />
          <line x1={w * 0.15} y1={h * 0.45} x2={w * 0.85} y2={h * 0.45} stroke="rgba(232,227,216,0.25)" strokeWidth="0.8" />
        </>
      )}
      <rect x="14" y={h - 70} width={w - 28} height="0.6" fill="rgba(232,227,216,0.5)" />
      <text x="14" y={h - 48} fill="#e8e3d8" fontSize="12" fontWeight="600" fontFamily="Geist, system-ui, sans-serif">
        {title.length > 22 ? title.slice(0, 21) + "…" : title}
      </text>
      {publisher && (
        <text x="14" y={h - 30} fill="rgba(232,227,216,0.55)" fontSize="9" fontFamily="ui-monospace, Menlo, monospace" style={{ letterSpacing: "0.06em" }}>
          {publisher.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
