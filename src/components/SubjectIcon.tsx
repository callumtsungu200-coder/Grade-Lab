import type { CSSProperties } from 'react'

export interface SubjectIconProps {
  subject: string
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * Signature line icons for each subject. Drawn as a single stroke on
 * a 24-unit grid so they scale cleanly at any size. All use
 * `currentColor` so the caller controls tint via CSS.
 *
 * Keep the stroke width and shape complexity uniform — this is a
 * navigation icon, not decorative art.
 */
export default function SubjectIcon({
  subject,
  size = 20,
  className,
  style,
}: SubjectIconProps) {
  const commonSvg = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  }

  switch (subject) {
    /* π — mathematics */
    case 'maths':
      return (
        <svg {...commonSvg}>
          <path d="M4 8 h16" />
          <path d="M9 8 v11" />
          <path d="M17 8 v9 c0 1 .8 2 2 2" />
          <path d="M6.5 8 c-.7 4 -1.8 8 -3 11" />
        </svg>
      )

    /* DNA helix — biology */
    case 'biology':
      return (
        <svg {...commonSvg}>
          <path d="M8 3 c4 3 4 6 0 9 s -4 6 0 9" />
          <path d="M16 3 c-4 3 -4 6 0 9 s 4 6 0 9" />
          <path d="M9 7 h6 M8 12 h8 M9 17 h6" />
        </svg>
      )

    /* Erlenmeyer flask — chemistry */
    case 'chemistry':
      return (
        <svg {...commonSvg}>
          <path d="M9 3 h6" />
          <path d="M10 3 v6 l-5 9 c-1 2 .5 3 2 3 h10 c1.5 0 3 -1 2 -3 l-5 -9 v-6" />
          <path d="M8 15 h8" />
          <circle cx="10" cy="18" r=".6" fill="currentColor" />
          <circle cx="13" cy="19" r=".6" fill="currentColor" />
        </svg>
      )

    /* Atom (nucleus + two orbits) — physics */
    case 'physics':
      return (
        <svg {...commonSvg}>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
        </svg>
      )

    /* Code brackets < / > — computer science */
    case 'computer-science':
      return (
        <svg {...commonSvg}>
          <path d="M8 7 l-5 5 l5 5" />
          <path d="M16 7 l5 5 l-5 5" />
          <path d="M14 5 l-4 14" />
        </svg>
      )

    /* Clapperboard — media studies */
    case 'media-studies':
      return (
        <svg {...commonSvg}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M3 8 l4 -4 l3 4 M10 4 l3 4 M13 4 l3 4 M16 4 l3 4" />
        </svg>
      )

    /* Scroll — history */
    case 'history':
      return (
        <svg {...commonSvg}>
          <path d="M5 5 c0 -1.5 3 -1.5 3 0 v10 c0 1.5 -3 1.5 -3 0" />
          <path d="M8 3 h9 c1.5 0 2 1 2 2 v14 c0 1.5 -1 2 -2 2 h-9" />
          <path d="M11 8 h5 M11 12 h5 M11 16 h3" />
        </svg>
      )

    /* Open book — english literature */
    case 'english-literature':
      return (
        <svg {...commonSvg}>
          <path d="M12 6 v15" />
          <path d="M12 6 c-2 -2 -5 -2 -8 -1 v14 c3 -1 6 -1 8 1" />
          <path d="M12 6 c2 -2 5 -2 8 -1 v14 c-3 -1 -6 -1 -8 1" />
        </svg>
      )

    /* Bar chart trending up — business */
    case 'business':
      return (
        <svg {...commonSvg}>
          <path d="M3 20 h18" />
          <rect x="5" y="14" width="3" height="6" rx=".5" />
          <rect x="10.5" y="10" width="3" height="10" rx=".5" />
          <rect x="16" y="6" width="3" height="14" rx=".5" />
          <path d="M4 8 l5 -4 l3 3 l6 -5" />
        </svg>
      )

    /* Scales of justice — citizenship */
    case 'citizenship':
      return (
        <svg {...commonSvg}>
          <path d="M12 3 v18" />
          <path d="M8 21 h8" />
          <path d="M4 6 h16" />
          <path d="M4 6 l-2 6 c0 2 4 2 4 0 z" />
          <path d="M20 6 l2 6 c0 2 -4 2 -4 0 z" />
        </svg>
      )

    /* Star + open book — religious studies */
    case 'religious-studies':
      return (
        <svg {...commonSvg}>
          <path d="M12 4 l1.2 2.5 l2.8 .4 l-2 2 l .5 2.7 l -2.5 -1.3 l -2.5 1.3 l .5 -2.7 l -2 -2 l 2.8 -.4 z" />
          <path d="M4 14 v6 c0 1 .5 1.5 1.5 1.5 h5 v-8 c-2 -1.5 -4.5 -1.5 -6.5 .5 z" />
          <path d="M20 14 v6 c0 1 -.5 1.5 -1.5 1.5 h-5 v-8 c2 -1.5 4.5 -1.5 6.5 .5 z" />
        </svg>
      )

    /* Speech bubble with a tilde — Spanish */
    case 'spanish':
      return (
        <svg {...commonSvg}>
          <path d="M4 6.5 a2.5 2.5 0 0 1 2.5 -2.5 h11 a2.5 2.5 0 0 1 2.5 2.5 v8 a2.5 2.5 0 0 1 -2.5 2.5 h-7.5 l-4.5 3.5 v-3.5 h-1 a2.5 2.5 0 0 1 -2.5 -2.5 z" />
          <path d="M8.5 11.2 c1 -1.4 2 -1.4 3 0 c1 1.4 2 1.4 3 0" />
        </svg>
      )

    /* Fallback — a hash / grid */
    default:
      return (
        <svg {...commonSvg}>
          <path d="M4 9 h16 M4 15 h16 M9 4 v16 M15 4 v16" />
        </svg>
      )
  }
}
