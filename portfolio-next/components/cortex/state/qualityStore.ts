import { create } from 'zustand'
import { PROFILES, QUALITY, recommendedProfile, type Profile } from '../config/quality'

/**
 * The chosen quality profile, plus the few values the PerfMonitor may lower while it runs.
 * A visitor's own choice is remembered in this browser and is never overridden automatically.
 */
const STORAGE_KEY = 'khj.brain-quality'

function readChoice(): Profile | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Profile | null
    return saved && PROFILES.includes(saved) ? saved : null
  } catch {
    return null // private window or blocked storage: fall back to the recommendation
  }
}

function live(profile: Profile) {
  const q = QUALITY[profile]
  return {
    profile,
    level: 0,
    dpr: q.maxPixelRatio,
    bloomIntensity: q.bloomIntensity,
    microDetail: q.microDetail,
    componentBudget: q.componentBudget,
  }
}

interface QualityState {
  profile: Profile
  recommended: Profile
  /** true once the visitor has picked a profile themselves. */
  chosen: boolean
  level: number
  dpr: number
  bloomIntensity: number
  microDetail: boolean
  componentBudget: number
  setProfile: (profile: Profile) => void
  downshift: () => void
}

// This module only ever loads in the browser (the section imports the brain with ssr: false).
const recommended = recommendedProfile()
const saved = typeof window === 'undefined' ? null : readChoice()

export const useQuality = create<QualityState>((set) => ({
  ...live(saved ?? recommended),
  recommended,
  chosen: saved !== null,
  setProfile: (profile) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, profile)
    } catch {
      /* the choice still applies for this visit */
    }
    set({ ...live(profile), chosen: true })
  },
  downshift: () =>
    set((s) => {
      if (s.level >= 2) return s
      const level = s.level + 1
      if (level === 1) {
        return { level, microDetail: false, dpr: Math.min(s.dpr, 1.25), bloomIntensity: Math.min(s.bloomIntensity, 0.6) }
      }
      return { level, dpr: 1, bloomIntensity: Math.min(s.bloomIntensity, 0.5), componentBudget: 0 }
    }),
}))
