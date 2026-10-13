const LINE_PATH =
  "M 138.5 0 L 138.5 373.523 C 138.5 422.622 112.031 467.907 69.25 492 C 26.469 516.093 0 561.378 0 610.477 L 0 985.5";

function FlowLine({ mirrored = false }: { mirrored?: boolean }) {
  const inner = (
    <>
      <path
        d={LINE_PATH}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeWidth={0.8}
        strokeLinecap="butt"
      />
      <path
        d={LINE_PATH}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.65}
        strokeWidth={1}
        strokeLinecap="round"
        strokeDasharray="1036.24 1036.24"
        className="animate-hero-line-flow"
        style={{ filter: "drop-shadow(0 0 1.5px currentColor)" }}
      />
    </>
  );

  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox="0 0 151 986"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      {mirrored ? (
        <g transform="translate(151, 0) scale(-1, 1)">{inner}</g>
      ) : (
        <g>{inner}</g>
      )}
    </svg>
  );
}

const OFFSETS = [0, 56, 112];

function LineColumn({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <>
      {OFFSETS.map((top) => (
        <div
          key={top}
          className="absolute h-[986px] w-[151px] pointer-events-none overflow-visible select-none"
          style={{ top: `${top}px` }}
        >
          <FlowLine mirrored={mirrored} />
        </div>
      ))}
    </>
  );
}

export function HeroLines() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible select-none text-foreground">
      {/* Isometric + hatch pattern, fading downward — same as reference */}
      <div
        className="absolute inset-x-0 top-0 h-[700px] w-full overflow-hidden pointer-events-none select-none opacity-30"
        style={{
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 120px, rgba(0,0,0,0.2) 260px, rgba(0,0,0,0.06) 440px, transparent 640px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 120px, rgba(0,0,0,0.2) 260px, rgba(0,0,0,0.06) 440px, transparent 640px)",
        }}
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hero-isometric-pattern"
              width="120"
              height="69.282"
              patternUnits="userSpaceOnUse"
            >
              <g transform="translate(30, 17.32)">
                <polygon
                  points="0,-17.32 30,0 0,17.32 -30,0"
                  fill="currentColor"
                  fillOpacity="0.04"
                  stroke="currentColor"
                  strokeOpacity="0.14"
                  strokeWidth="0.8"
                />
                <polygon
                  points="-30,0 0,17.32 0,51.96 -30,34.64"
                  fill="currentColor"
                  fillOpacity="0.02"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="0.8"
                />
                <polygon
                  points="0,17.32 30,0 30,34.64 0,51.96"
                  fill="currentColor"
                  fillOpacity="0.03"
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="0.8"
                />
              </g>
              <g transform="translate(90, 51.96)">
                <polygon
                  points="0,-17.32 30,0 0,17.32 -30,0"
                  fill="currentColor"
                  fillOpacity="0.04"
                  stroke="currentColor"
                  strokeOpacity="0.14"
                  strokeWidth="0.8"
                />
                <polygon
                  points="-30,0 0,17.32 0,51.96 -30,34.64"
                  fill="currentColor"
                  fillOpacity="0.02"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="0.8"
                />
                <polygon
                  points="0,17.32 30,0 30,34.64 0,51.96"
                  fill="currentColor"
                  fillOpacity="0.03"
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="0.8"
                />
              </g>
              <g transform="translate(90, -17.32)">
                <polygon
                  points="0,17.32 0,51.96 -30,34.64 -30,0"
                  fill="currentColor"
                  fillOpacity="0.02"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="0.8"
                />
                <polygon
                  points="0,17.32 30,0 30,34.64 0,51.96"
                  fill="currentColor"
                  fillOpacity="0.03"
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="0.8"
                />
              </g>
            </pattern>
            <pattern
              id="hero-hatch-pattern"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M-1,5 L5,-1 M-1,19 L19,-1 M-1,33 L33,-1 M9,33 L33,9 M23,33 L33,23"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-isometric-pattern)" />
          <rect
            width="100%"
            height="100%"
            fill="url(#hero-hatch-pattern)"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Flowing S-curve lines — exact replica of reference (3 left mirrored + 3 right) */}
      <div
        className="absolute top-0 bottom-[-300px] left-1/2 hidden w-[1014px] -translate-x-1/2 overflow-visible pointer-events-none md:block"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 4%, black 10%, black 84%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 4%, black 10%, black 84%, transparent 100%)",
        }}
      >
        <div className="absolute top-0 bottom-0 left-[4px] w-[151px]">
          <LineColumn mirrored />
        </div>
        <div className="absolute top-0 bottom-0 left-[859px] w-[151px]">
          <LineColumn />
        </div>
      </div>
    </div>
  );
}
