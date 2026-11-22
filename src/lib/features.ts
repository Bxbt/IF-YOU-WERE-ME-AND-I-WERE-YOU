/**
 * Which screens exist yet. Buttons leading to a screen that is not built are shown disabled
 * with an honest label instead of leading nowhere (docs/10: no fake features).
 * Flip a flag in the milestone that ships the screen.
 */
export const FEATURES = {
  characterCreation: false, // S3 — M3
  chapters: false, // S5/S6 — M4
  together: false, // Phase 2
  remote: false, // Phase 3
  sound: false, // Phase 2 (audit M-9)
} as const;

export type FeatureKey = keyof typeof FEATURES;
