// One short tip at a time, about the weakest point of the current design.

import { Design, facadeAzimuth } from '../sim/design';
import type { Result } from '../sim/simulate';
import type { Control } from './missions';
import { compassName, num, offSouth } from './format';

export interface Tip {
  text: string;
  rule?: string;
}

export function coachTip(d: Design, r: Result, open: Set<Control>): Tip | null {
  const front = facadeAzimuth(d, 'front');
  const back = facadeAzimuth(d, 'back');
  const tips: Tip[] = [];
  const add = (cond: boolean, control: Control, tip: Tip) => {
    if (cond && open.has(control)) tips.push(tip);
  };

  const main = d.windows.front >= d.windows.back ? front : back;
  add(offSouth(main) > 30, 'orientation', {
    text: `The big windows face ${compassName(main)}. Within 30° of south they catch the low winter sun.`,
    rule: 'Rule 1',
  });
  add(r.daylight.front < 1, 'windows', {
    text: `The rooms on the ${compassName(front)} side are too dark. Add some window area there.`,
    rule: 'Rule 2',
  });
  add(r.daylight.back < 1, 'windows', {
    text: `The rooms on the ${compassName(back)} side are too dark. Add some window area there.`,
    rule: 'Rule 2',
  });
  add(d.shading === 'inside' && r.overheatHours > 100, 'shading', {
    text: 'Blinds inside the glass catch the sun, but the heat stays in the room. Shade outside.',
    rule: 'Rule 5',
  });
  add(d.mass === 'carpet', 'mass', {
    text: 'The concrete is hidden under carpet and wood: the sun cannot reach it, so it works like a light house.',
    rule: 'Rule 4',
  });
  add((d.mass === 'heavy' || d.mass === 'medium') && !d.summerMode && r.overheatHours > 200, 'summer', {
    text: 'Mass stores the heat of the day. Without cool night air it stays warm: try the summer ventilation.',
    rule: 'Slide 20',
  });
  add(d.shading === 'none' && r.overheatHours > 300, 'shading', {
    text: `${num(r.overheatHours)} hours above 26 °C. Shading outside the glass stops the sun before it becomes heat in the room.`,
    rule: 'Rule 5',
  });
  add(!d.summerMode && r.overheatHours > 300, 'summer', {
    text: 'In summer the heat recovery warms the fresh air. Bypass it and air the house at night.',
    rule: 'Slide 20',
  });
  add(d.shading === 'overhang' && d.overhang >= 1.2, 'shading', {
    text: 'A deep overhang also takes the sun in March and October, when the house still needs it.',
    rule: 'Slide 11',
  });
  add(d.glazing === 'solar' && r.heating > 2500, 'glazing', {
    text: 'Solar control glass blocks the sun all year, also in winter. Shading that moves does better.',
    rule: 'Rule 5',
  });
  add(d.glazing === 'double', 'glazing', {
    text: 'Double glazing loses heat all winter. Triple glazing: U ≤ 0.8, g ≈ 0.5.',
    rule: 'Rule 3',
  });
  add(offSouth(back) > 120 && r.daylight.back > 1.35, 'windows', {
    text: `The ${compassName(back)} windows are larger than daylight needs. They lose heat all winter and gain little.`,
    rule: 'Rule 6',
  });
  add(d.windows.left + d.windows.right > 12 && r.overheatHours > 100, 'windows', {
    text: 'Windows on the gables get the low morning and evening sun in summer, which is hard to shade.',
    rule: 'Slide 9',
  });
  add(r.daylight.front > 1.6 && offSouth(front) <= 45, 'windows', {
    text: 'The south windows are larger than daylight needs: more power on the coldest day, more heat in summer.',
    rule: 'Rule 2',
  });
  add(d.envelope === 'old', 'envelope', {
    text: 'This is the house of 6 October: thin insulation and no heat recovery.',
  });

  return tips[0] ?? null;
}
