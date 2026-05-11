/** Decorative mark — circular motif & mint wedge (layout vibe similar to player-insight.com hero) */
export function HeroMark() {
  return (
    <div className="relative mx-auto w-[min(100%,200px)] shrink-0">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full drop-shadow-[0_0_40px_rgba(45,212,160,0.25)]"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="#0D1525"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.5"
        />
        <path
          d="M50 50 L50 2 A48 48 0 0 1 98 50 Z"
          fill="#2dd4a0"
          opacity="0.28"
        />
        <circle
          cx="50"
          cy="50"
          r="48"
          stroke="rgba(45,212,160,0.15)"
          strokeWidth="1"
        />
        {/* abstract bracket / rally lines */}
        <path
          d="M28 58 L28 72 M28 58 H38 Q44 58 44 65 Q44 72 38 72 H28"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <path
          d="M62 52 L62 72"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="74" cy="44" r="6" fill="#2dd4a0" />
      </svg>
    </div>
  );
}
