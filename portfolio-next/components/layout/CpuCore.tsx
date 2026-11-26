// The sidebar's identity mark: a neon processor, the heart of the cyber city.
// Drawn inline (no download). Its pulse lives in globals.css and only animates transform and opacity.

const PINS = [38, 50, 62];

export default function CpuCore() {
  return (
    <svg className="cpu-core__chip" viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {PINS.map((v) => (
          <path key={v} strokeWidth="3.2" d={`M${v} 27V17M${v} 73V83M27 ${v}H17M73 ${v}H83`} />
        ))}
        <rect x="27" y="27" width="46" height="46" rx="8" strokeWidth="3.4" fill="rgba(8, 47, 73, 0.75)" />
        {/* traces from the die to the package corners */}
        <path strokeWidth="1.6" opacity="0.75" d="M40 40L34 34M60 40L66 34M40 60L34 66M60 60L66 66" />
      </g>
      <rect className="cpu-core__die" x="39" y="39" width="22" height="22" rx="4.5" />
    </svg>
  );
}
