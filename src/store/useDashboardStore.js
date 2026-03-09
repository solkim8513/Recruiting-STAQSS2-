import { create } from 'zustand'

export const useDashboardStore = create((set) => ({
  candidates: [],
  lastLoadedAt: null,

  setCandidates(candidates) {
    set({ candidates, lastLoadedAt: new Date().toISOString() })
  },
}))
