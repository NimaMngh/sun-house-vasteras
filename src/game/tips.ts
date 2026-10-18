// One short tip at a time, about the weakest point of the current design.
// Shown in the last missions, where nothing else guides the student.

import { Design, FACADES, facadeAzimuth } from '../sim/design';
import type { Result } from '../sim/simulate';
import { compassName, offSouth } from './format';

export interface Tip {
  text: string;
  rule?: string;
}

/** Window area on the north and west sides: rule 6 of slide 24. */
export function northWestArea(d: Design) {
  return FACADES.reduce((sum, f) => {
    const az = facadeAzimuth(d, f);
    const north = offSouth(az) >= 135;
    const west = az >= 225 && az <= 315;
    return north || west ? sum + d.windows[f] : sum;
  }, 0);
}

export function coachTip(d: Design, r: Result): Tip | null {
  const front = facadeAzimuth(d, 'front');
  const back = facadeAzimuth(d, 'back');
  const main = d.windows.front >= d.windows.back ? front : back;
  const tips: Tip[] = [];
  const add = (cond: boolean, tip: Tip) => {
    if (cond) tips.push(tip);
  };

  add(offSouth(main) > 30, {
    text: `The big windows face ${compassName(main)}. Within 30° of south they catch the low winter sun.`,
    rule: 'Rule 1',
  });
  add(r.daylight.front < 1, {
    text: `The rooms on the ${compassName(front)} side are too dark. Add some window area there.`,
    rule: 'Rule 2',
  });
  add(r.daylight.back < 1, {
    text: `The rooms on the ${compassName(back)} side are too dark. Add some window area there.`,
    rule: 'Rule 2',
  });
  add(d.glazing === 'double', {
    text: 'Double glazing loses heat all winter. Triple glazing: U ≤ 0.8, g ≈ 0.5.',
    rule: 'Rule 3',
  });
  add(d.mass === 'carpet', {
    text: 'The concrete is hidden under carpet and wood: the sun cannot reach it, so it works like a light house.',
    rule: 'Rule 4',
  });
  add(d.mass === 'light' && r.overheatHours > 200, {
    text: 'Heavy floors and inner walls, where the sun hits them, store the heat of the day for the night.',
    rule: 'Rule 4',
  });
  add(d.shading === 'none' && r.overheatHours > 300, {
    text: `A blind on the outside of the window stops the sun before it becomes heat in the room.`,
    rule: 'Rule 5',
  });
  add(d.shading === 'inside' && r.overheatHours > 100, {
    text: 'A blind inside the glass catches the sun, but the heat stays in the room. Shade outside.',
    rule: 'Rule 5',
  });
  add(d.shading === 'overhang' && d.overhang >= 1.2 && r.heating > 1800, {
    text: 'A deep fixed overhang also takes the sun in March and October, when the house still needs it.',
    rule: 'Slide 11',
  });
  add(d.glazing === 'solar' && r.heating > 2500, {
    text: 'Solar control glass blocks the sun all year, also in winter. A blind that moves does better.',
    rule: 'Rule 5',
  });
  add(offSouth(back) > 120 && r.daylight.back > 1.35, {
    text: `The ${compassName(back)} windows are larger than daylight needs. North windows lose heat all winter and gain little.`,
    rule: 'Rule 6',
  });
  add(northWestArea(d) > 12 && r.overheatHours > 100, {
    text: 'West windows get the low afternoon sun in summer, when the rooms are already warm.',
    rule: 'Rule 6',
  });
  add(d.windows.left + d.windows.right > 12 && r.overheatHours > 100, {
    text: 'Windows on the gables get the low morning and evening sun in summer, which is hard to shade.',
    rule: 'Slide 9',
  });
  add(r.daylight.front > 1.6 && offSouth(front) <= 45, {
    text: 'The south windows are larger than daylight needs: more power on the coldest day, more heat in summer.',
    rule: 'Rule 2',
  });
  add(d.envelope === 'old', {
    text: 'This is the house of 6 October: thin insulation and no heat recovery.',
  });

  return tips[0] ?? null;
}
