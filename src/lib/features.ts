/**
 * Which screens exist yet. Buttons leading to a screen that is not built are shown disabled
 * with an honest label instead of leading nowhere (docs/10: no fake features).
 * Flip a flag in the milestone that ships the screen.
 */
export const FEATURES = {
  characterCreation: true, // S3/S4 — shipped in M3
  chapters: true, // S5/S5a/S6 — shipped in M4 (Ch1; Ch2–Ch5 content arrives in M5, shown as coming soon)
  together: true, // Phase 2 — Play Together on one device (M8–M10b)
  remote: false, // Phase 3
  sound: true, // synthesised with WebAudio (Q-08 option 1); off until the player turns it on
} as const;

export type FeatureKey = keyof typeof FEATURES;
