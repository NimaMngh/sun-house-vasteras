// The design score: heating 300, summer comfort 250, daylight 250, peak power 200.

import { FLOOR_AREA } from '../sim/design';
import type { Result } from '../sim/simulate';

type Curve = [number, number][];

function interp(x: number, curve: Curve) {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i];
    if (x <= x1) {
      const [x0, y0] = curve[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return curve[curve.length - 1][1];
}

/** kWh per m² floor and year */
const HEATING: Curve = [
  [0, 300], [10, 293], [15, 278], [20, 259], [30, 221], [45, 168], [60, 125], [90, 66], [130, 18], [160, 0],
];
/** hours above 26 °C */
const OVERHEAT: Curve = [
  [0, 250], [25, 246], [50, 238], [100, 220], [200, 186], [400, 136], [700, 90], [1000, 55], [2000, 30], [3000, 14], [4000, 0],
];
/** W per m² floor at −20 °C */
const PEAK: Curve = [
  [10, 200], [15, 190], [20, 173], [30, 134], [45, 78], [65, 21], [80, 0],
];

export const MAX_POINTS = { heating: 300, comfort: 250, daylight: 250, peak: 200 };
export const MAX_SCORE = 1000;
/** points for one, two and three stars */
export const STARS = [650, 850, 950];

export interface Score {
  heating: number;
  comfort: number;
  daylight: number;
  peak: number;
  total: number;
  stars: number;
}

export function score(r: Result): Score {
  const heating = interp(r.heating / FLOOR_AREA, HEATING);
  const comfort = interp(r.overheatHours, OVERHEAT);
  const peak = interp(r.peakLoad / FLOOR_AREA, PEAK);
  const f = Math.min(1, r.daylight.front);
  const b = Math.min(1, r.daylight.back);
  const daylight = 125 * (f * f + b * b);
  const total = Math.round(heating + comfort + peak + daylight);
  const stars = STARS.filter((s) => total >= s).length;
  return { heating, comfort, daylight, peak, total, stars };
}
