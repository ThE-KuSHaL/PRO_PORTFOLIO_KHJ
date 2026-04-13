// components/hero/ProjectTicker.tsx
export default function ProjectTicker() {
  const items = [
    'FLOW', 'DHARMAJYOTI', 'VAHANA', 'Confidential B2B Venture',
    'FLOW', 'DHARMAJYOTI', 'VAHANA', 'Confidential B2B Venture',
  ];
  return (
    <>
      <style>{`
        .ticker-wrap {
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .ticker-track {
          display: flex;
          gap: 0;
          animation: marquee 28s linear infinite;
          width: max-content;
        }
      `}</style>
      <div className="ticker-wrap" aria-label="Projects">
        <div className="ticker-track">
          {items.map((item, i) => (
            <span
              key={i}
              style={{
                padding: '0 1.5rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: i % 2 === 0 ? 'rgba(6,182,212,0.7)' : 'rgba(99,102,241,0.6)',
                whiteSpace: 'nowrap',
                borderRight: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
