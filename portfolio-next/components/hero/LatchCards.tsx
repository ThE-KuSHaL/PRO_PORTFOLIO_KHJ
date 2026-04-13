'use client';
// components/hero/LatchCards.tsx
import { motion } from 'framer-motion';

interface LatchCardsProps {
  onClose: () => void;
}

const CARDS = [
  { label: 'The Deep Diver', sub: 'Who I am', target: '#about', color: '#06b6d4' },
  { label: 'The Recruiter', sub: 'What I know', target: '#skills', color: '#6366f1' },
  { label: 'Credibility Check', sub: 'What I built', target: '#projects', color: '#4f87ff' },
];

export default function LatchCards({ onClose }: LatchCardsProps) {
  function scrollTo(target: string) {
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    onClose();
  }

  return (
    <div
      id="latch-wrap"
      style={{
        position: 'absolute',
        top: 0,
        left: '100%',
        paddingLeft: 18,
        paddingRight: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 30,
        width: 220,
      }}
    >
      {CARDS.map((card, i) => (
        <motion.button
          key={card.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.28, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => {
            e.stopPropagation();
            scrollTo(card.target);
          }}
          data-cursor
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '10px 14px',
            borderRadius: 10,
            border: `1px solid ${card.color}55`,
            background: 'rgba(3,8,20,0.88)',
            backdropFilter: 'blur(18px)',
            cursor: 'none',
            textAlign: 'left',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
          onHoverStart={(e) => {
            (e.target as HTMLElement).style.background = `${card.color}14`;
            (e.target as HTMLElement).style.boxShadow = `0 0 20px ${card.color}44`;
          }}
          onHoverEnd={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(3,8,20,0.88)';
            (e.target as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: card.color }}>{card.label}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{card.sub}</span>
        </motion.button>
      ))}
    </div>
  );
}
