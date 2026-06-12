/**
 * Lucide icons (lucide.dev, ISC license) inlined as components — the Slock
 * spec names Lucide as its icon library, but this codebase allows no new
 * runtime dependencies, so the three glyphs used are inlined verbatim:
 * plane-takeoff, plane-landing, send.
 */

function LucideSvg({
  size,
  label,
  children,
}: {
  size: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      className="block"
    >
      {children}
    </svg>
  );
}

export function PlaneTakeoffIcon({
  size = 16,
  label = "takeoff",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <LucideSvg size={size} label={label}>
      <path d="M2 22h20" />
      <path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z" />
    </LucideSvg>
  );
}

export function PlaneLandingIcon({
  size = 16,
  label = "landing",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <LucideSvg size={size} label={label}>
      <path d="M2 22h20" />
      <path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z" />
    </LucideSvg>
  );
}

export function SendIcon({
  size = 18,
  label = "share",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <LucideSvg size={size} label={label}>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </LucideSvg>
  );
}
