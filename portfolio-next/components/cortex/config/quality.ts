/**
 * Project Cortex — the three quality profiles.
 *
 * The same brain and the same seven regions in every profile; what changes is cost. Visitors can switch
 * with the buttons at the bottom left of the section, and the first choice is made from the device.
 * Model files come from tools/blender/export_brain_lod.py.
 */

import { computeGpuTier, type GpuTier } from '@/lib/device'

export type Profile = 'lite' | 'balanced' | 'full'

export interface QualitySettings {
  profile: Profile
  label: string
  model: string
  /** false = a still picture: static lighting, redrawn only when the visitor does something. */
  animate: boolean
  maxPixelRatio: number
  /** Post-processing (bloom, vignette, SMAA). Without it the renderer tone-maps by itself. */
  effects: boolean
  bloomIntensity: number
  /** Multisample anti-aliasing inside the post-processing buffer (thin stand details shimmer without it). */
  msaa: number
  shadows: boolean
  /** See-through stand material: it makes three.js draw the scene a second time every frame. */
  glass: boolean
  clearcoat: boolean
  microDetail: boolean
  /** Share of the small surface-mounted parts ("cells") to place; 0 leaves them out. */
  componentBudget: number
  particleCount: number
  envResolution: number
}

export const PROFILES: Profile[] = ['lite', 'balanced', 'full']

export const QUALITY: Record<Profile, QualitySettings> = {
  lite: {
    profile: 'lite', label: 'Lite', model: '/models/brain_lite.glb', animate: false, maxPixelRatio: 1.5,
    effects: false, bloomIntensity: 0, msaa: 0, shadows: false, glass: false, clearcoat: false, microDetail: false,
    componentBudget: 0, particleCount: 0, envResolution: 64,
  },
  balanced: {
    profile: 'balanced', label: 'Balanced', model: '/models/brain_balanced.glb', animate: true, maxPixelRatio: 1.25,
    effects: true, bloomIntensity: 0.65, msaa: 2, shadows: false, glass: false, clearcoat: true, microDetail: false,
    componentBudget: 0.45, particleCount: 120, envResolution: 128,
  },
  full: {
    profile: 'full', label: 'Full', model: '/models/brain_full.glb', animate: true, maxPixelRatio: 2,
    effects: true, bloomIntensity: 0.85, msaa: 4, shadows: true, glass: true, clearcoat: true, microDetail: true,
    componentBudget: 1, particleCount: 380, envResolution: 256,
  },
}

/** Phones, touch screens, reduced motion and small machines start on Lite. */
const BY_TIER: Record<GpuTier, Profile> = { none: 'lite', low: 'lite', mid: 'balanced', high: 'full' }

export function recommendedProfile(): Profile {
  return typeof window === 'undefined' ? 'full' : BY_TIER[computeGpuTier()]
}

/**
 * Orbit distance that keeps the exhibit inside the frame. Landscape sits far enough back that the
 * stand is not cut off; portrait (phones) pulls back so the brain's width fits instead of being cropped.
 */
export function baseCameraDistance(aspect: number): number {
  if (!isFinite(aspect) || aspect >= 1.2) return 4.95
  return Math.min(7.4, 4.5 * Math.max(1, 1.2 / Math.max(aspect, 0.45)) * 0.8)
}
