'use client';
// components/ui/ScrollIndicator.tsx
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ScrollIndicator() {
  const [visible, setVisible] = useState(false);
  const contMs = useRef(0);
  const lastTick = useRef(performance.now());
  const isScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      isScrolling.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        isScrolling.current = false;
        contMs.current = 0;
      }, 150);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    let rafId: number;
    function check(now: number) {
      const delta = now - lastTick.current;
      lastTick.current = now;
      if (isScrolling.current && !visible) {
        contMs.current += delta;
        if (contMs.current > 8000) {
          setVisible(true);
          if (hideTimeout.current) clearTimeout(hideTimeout.current);
          hideTimeout.current = setTimeout(() => {
            setVisible(false);
            contMs.current = 0;
          }, 5000);
        }
      }
      rafId = requestAnimationFrame(check);
    }
    rafId = requestAnimationFrame(check);

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            bottom: '1.8rem',
            left: '72px',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          aria-label="Scroll indicator"
        >
          {/* Mouse icon */}
          <svg width="20" height="28" viewBox="0 0 20 28" aria-hidden="true">
            <rect x="1" y="1" width="18" height="26" rx="9" fill="none" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
            <rect
              x="9" y="5" width="2" height="6" rx="1"
              fill="#06b6d4"
              style={{ animation: 'sdrop 1.5s ease-in-out infinite' }}
            />
          </svg>
          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(6,182,212,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            scroll
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
