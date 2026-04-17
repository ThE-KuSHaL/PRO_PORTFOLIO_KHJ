'use client';
import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouchDevice(true);
      return;
    }

    // Set hardware cursor to the exact crosshair shape via CSS 'url()', providing 0 latency.
    const crosshairSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><line x1="12" y1="4" x2="12" y2="20" stroke="%2306b6d4" stroke-width="1.5"/><line x1="4" y1="12" x2="20" y2="12" stroke="%2306b6d4" stroke-width="1.5"/></svg>`;
    
    const styleBlock = document.createElement('style');
    styleBlock.innerHTML = `
      * {
        cursor: url('${crosshairSvg}') 12 12, crosshair !important;
      }
    `;
    document.head.appendChild(styleBlock);

    return () => {
      document.head.removeChild(styleBlock);
    };
  }, []);

  if (isTouchDevice) return null;

  return null;
}
