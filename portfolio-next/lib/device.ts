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

// ── GPU tier: which tree mesh / effects a device gets ───────────────────────
export type GpuTier = 'none' | 'low' | 'mid' | 'high';

/**
 * none : data-saver / reduced-motion / ≤2 GB RAM → no WebGL, plain fallback
 * low  : phones, touch, ≤4 GB or ≤4 cores           → 2.8k-tri mesh, cheap shaders, 30 fps, DPR 1
 * mid  : ≤6 GB or ≤6 cores                          → 9k-tri mesh, full shaders, DPR ≤ 1.5
 * high : everything else                            → 30k-tri mesh, DPR ≤ 1.75, antialiasing
 */
export function computeGpuTier(): GpuTier {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const mm = (q: string) => window.matchMedia(q).matches;
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  if (nav.connection?.saveData || mm('(prefers-reduced-motion: reduce)') || mem <= 2) return 'none';
  if (mm('(max-width: 767px)') || mm('(pointer: coarse)') || mem <= 4 || cores <= 4) return 'low';
  if (mem <= 6 || cores <= 6) return 'mid';
  return 'high';
}

const noopSubscribe = () => () => {};
let cachedTier: GpuTier | null = null;

/** `null` before hydration, then a stable tier for the session. */
export function useGpuTier(): GpuTier | null {
  return useSyncExternalStore<GpuTier | null>(
    noopSubscribe,
    () => (cachedTier ??= computeGpuTier()),
    () => null,
  );
}
