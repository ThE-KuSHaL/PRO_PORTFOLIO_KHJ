'use client';
// components/ui/ScrollNav.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLayoutStore } from '@/store/layoutStore';
import { useIsMobile } from '@/lib/device';

const SECTION_IDS = ['hero', 'about', 'education', 'skills', 'projects', 'venture', 'journey', 'contact'];

function getNextSection(dir: 'up' | 'down', currentId: string): string | null {
  let currentIndex = SECTION_IDS.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  
  if (dir === 'up') {
    return currentIndex > 0 ? `#${SECTION_IDS[currentIndex - 1]}` : null;
  } else {
    return currentIndex < SECTION_IDS.length - 1 ? `#${SECTION_IDS[currentIndex + 1]}` : null;
  }
}

export default function ScrollNav() {
  const [visible, setVisible] = useState(false);
  const { activeSection } = useLayoutStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 200); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleUp() {
    const target = getNextSection('up', activeSection);
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleDown() {
    const target = getNextSection('down', activeSection);
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }

  const btnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(3,8,16,0.85)',
    border: '1px solid rgba(6,182,212,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'none', backdropFilter: 'blur(8px)',
    transition: 'border-color 0.2s, background 0.2s',
  };

  if (isMobile) return null; // phones scroll natively; the buttons only covered content

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 60, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{
            // bottom-right: on short screens the old left position sat on top of the text
            position: 'fixed',
            right: '1.25rem',
            bottom: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: 8,
            zIndex: 40,
          }}
        >
          <button onClick={handleUp} style={btnStyle} aria-label="Scroll up" data-cursor>
            <ChevronUp size={16} color="#06b6d4" />
          </button>
          <button onClick={handleDown} style={btnStyle} aria-label="Scroll down" data-cursor>
            <ChevronDown size={16} color="#06b6d4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
