// Shading geometry from the lecture, as plain functions the simulation and the
// checks in scripts/verify.ts both use.

/**
 * Share of a window's height in the shadow of an overhang (slide 10):
 * shaded height = P·tan(α) − G, measured down from the overhang,
 * where P is the depth, G the gap above the window and α the sun's
 * profile angle on the facade (the sun's height at noon on a south facade).
 */
export function overhangShade(depth: number, gap: number, windowHeight: number, tanProfile: number) {
  if (depth <= 0 || tanProfile <= 0) return 0;
  return Math.min(1, Math.max(0, (depth * tanProfile - gap) / windowHeight));
}

/**
 * True when a long building in front of the window hides the sun (task 1):
 * the sun is lower than the roof, tan(α) < Δh / d. For a sun that is not
 * straight in front, the way to the building is longer, d / cos(γ).
 * rise: roof height above the window, distance: to the building,
 * cosAz: cosine of the sun's azimuth measured from the direction of the building.
 */
export function behindObstacle(tanAltitude: number, cosAz: number, rise: number, distance: number) {
  if (cosAz <= 0) return false;
  return tanAltitude < (rise / distance) * cosAz;
}
