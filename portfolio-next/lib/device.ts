'use client';
// lib/device.ts
// One source of truth for "should this device get the lightweight experience?".
//
// `lite` = phone / touch / low RAM / few cores / data-saver / reduced-motion.
// The same rule runs in an inline <head> script (see LITE_SCRIPT) so <html data-lite>
// is set before first paint — CSS and JS therefore always agree, with no layout flash.

import { useSyncExternalStore } from 'react';

/** Inline, dependency-free copy of the detection rule. Injected in app/layout.tsx. */
export const LITE_SCRIPT = `(function(){try{var d=document.documentElement,n=navigator,c=n.connection,m=function(q){return matchMedia(q).matches};if(m('(max-width: 767px)')||m('(pointer: coarse)')||m('(prefers-reduced-motion: reduce)')||(c&&c.saveData)||(n.deviceMemory||8)<=4||(n.hardwareConcurrency||8)<=4)d.setAttribute('data-lite','1')}catch(e){}})();`;

const NARROW = '(max-width: 767px)';

function subscribeLite(cb: () => void) {
  const mq = window.matchMedia(NARROW);
  const onChange = () => {
    // Narrowing the window upgrades to lite; widening never downgrades (sticky).
    if (mq.matches) document.documentElement.setAttribute('data-lite', '1');
    cb();
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const getLiteSnapshot = () => document.documentElement.hasAttribute('data-lite');

/** `null` on the server / before hydration, then true|false. Gate heavy mounts on `=== false`. */
export function useLite(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribeLite, getLiteSnapshot, () => null);
}

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Viewport < 768px. Prefer CSS media queries; use this only when JSX must differ. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}
