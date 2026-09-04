// Grade Lab logo, recreated as SVG + text so it recolours per theme.
// The flask/A+ mark uses the brand blue→purple gradient (reads on light AND
// dark); "Grade" uses the current text colour; "Lab" uses the brand gradient.
// No backing tile / outline.
export default function Logo({ className = "" }) {
  return (
    <span className={"brandlogo " + className}>
      <svg className="brandlogo-mark" viewBox="0 0 40 44" aria-hidden="true">
        <defs>
          <linearGradient id="glab" x1="4" y1="4" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3aa0ff" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* flask silhouette */}
        <path
          d="M16 5 h8 a1.6 1.6 0 0 1 0 3.2 h-0.4 V15.5 L31.6 34.2 a3.4 3.4 0 0 1 -3 5.3 H11.4 a3.4 3.4 0 0 1 -3 -5.3 L16.4 15.5 V8.2 H16 a1.6 1.6 0 0 1 0 -3.2 Z"
          fill="url(#glab)"
        />
        {/* bubbles */}
        <circle cx="20" cy="3.2" r="1.5" fill="url(#glab)" />
        <circle cx="22.4" cy="19" r="1.15" fill="#ffffff" opacity="0.9" />
        <circle cx="17.6" cy="24" r="1.5" fill="#ffffff" opacity="0.9" />
        {/* A+ card */}
        <g transform="rotate(-7 20 31)">
          <rect x="11.5" y="24.5" width="17.5" height="13.5" rx="3" fill="#ffffff" />
          <text x="20.2" y="34.4" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" fill="url(#glab)">A+</text>
        </g>
      </svg>
      <span className="brandlogo-word">Grade<span>&nbsp;Lab</span></span>
    </span>
  )
}
