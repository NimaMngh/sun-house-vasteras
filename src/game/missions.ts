// The missions follow the six rules of slide 23, plus the paradox of slide 18
// that the class discusses right after the app (slide 25).

import { Design, FLOOR_AREA, START_DESIGN } from '../sim/design';
import type { Result } from '../sim/simulate';
import { STARS, type Score } from './score';
import { num, pct } from './format';

export type Control = 'orientation' | 'windows' | 'glazing' | 'envelope' | 'mass' | 'shading' | 'summer' | 'site';

export interface Snapshot {
  heating: number;
  overheat: number;
  peak: number;
  useful: number;
  score: number;
  /** seconds spent on the mission, set when it is complete */
  seconds?: number;
}

export function snapshot(r: Result, s: Score): Snapshot {
  return { heating: r.heating, overheat: r.overheatHours, peak: r.peakLoad, useful: r.usefulShare, score: s.total };
}

export interface Goal {
  label: string;
  /** a few words for the bar on top of the screen */
  short: string;
  value: (r: Result, d: Design, s: Score) => string;
  ok: (r: Result, d: Design, s: Score) => boolean;
}

export type Guess = 'up' | 'same' | 'down';

export interface Mission {
  id: string;
  title: string;
  /** which rule or slide the mission trains */
  tag: string;
  brief: (r: Result) => string;
  hint: string;
  unlocks: Control[];
  goals: Goal[];
  /** a guess the student makes before the controls open */
  guess?: { question: string; options: { id: Guess; label: string }[]; answer: Guess };
  /** changes made to the design when the mission starts */
  setup?: (d: Design) => Design;
  insight: { title: string; text: (before: Snapshot, after: Snapshot) => string; source: string };
  bonus?: boolean;
  /** show a running clock */
  timed?: boolean;
}

const daylightOk = (r: Result) => r.daylight.front >= 1 && r.daylight.back >= 1;
const daylightValue = (r: Result) => {
  const worst = Math.min(r.daylight.front, r.daylight.back);
  return worst >= 1 ? 'both sides' : `${pct(worst)} on the darker side`;
};
const kWh = (x: number) => `${num(x)} kWh`;
const kW = (w: number) => `${num(w / 1000, 1)} kW`;
const change = (a: number, b: number) => Math.round((100 * (b - a)) / Math.max(1, a));

export const MISSIONS: Mission[] = [
  {
    id: 'south',
    title: 'Face the sun',
    tag: 'Rule 1 · Face south',
    brief: () =>
      'The client’s sketch puts the big glass wall towards the street, to the north. Turn the house so the big windows catch the winter sun.',
    hint: 'From October to April a south window gets four times the sun of a north window (slide 9). Drag the house on the compass, or use the slider.',
    unlocks: ['orientation'],
    goals: [
      {
        label: 'Heating below 6 300 kWh a year',
        short: 'Heating < 6 300 kWh',
        value: (r) => kWh(r.heating),
        ok: (r) => r.heating < 6300,
      },
    ],
    insight: {
      title: 'Plenty of sun, but at the wrong time',
      text: (b, a) =>
        `Facing south cut the heating by ${-change(b.heating, a.heating)} %. ` +
        (a.overheat > b.overheat
          ? `But the same sun gave ${num(a.overheat - b.overheat)} more hours above 26 °C in summer, when nobody needs heat. Remember that for mission 5.`
          : 'The sun is strongest in summer, when nobody needs heat. Remember that for mission 5.'),
      source: 'Slides 2 and 9',
    },
  },
  {
    id: 'daylight',
    title: 'Size for daylight',
    tag: 'Rules 2 and 6 · Daylight, few north windows',
    brief: () =>
      'The bedrooms at the back are too dark, and the big glass wall makes the house costly to heat on the coldest day. Resize the windows.',
    hint: 'Each side of the house needs glass of about 10 % of its floor area. Every extra m² of window adds about 50 W on the coldest day, and north windows gain almost nothing.',
    unlocks: ['windows'],
    goals: [
      { label: 'Enough daylight on both sides', short: 'Daylight both sides', value: daylightValue, ok: daylightOk },
      {
        label: 'Peak heat below 4.7 kW at −20 °C',
        short: 'Peak < 4.7 kW',
        value: (r) => kW(r.peakLoad),
        ok: (r) => r.peakLoad < 4700,
      },
    ],
    insight: {
      title: 'As large as daylight needs, not larger',
      text: (b, a) =>
        `You cut the heat load on the coldest day by ${num(b.peak - a.peak)} W. Extra glass is nearly neutral on the south over a year, but it costs power on the coldest day and overheats in summer. North windows lose heat all winter.`,
      source: 'Slides 22 and 23',
    },
  },
  {
    id: 'glass',
    title: 'Good glass',
    tag: 'Rule 3 · Good glass',
    brief: () => 'The windows still have old double glazing. Choose better glass, and keep the daylight.',
    hint: 'Look at U (heat loss) and g (sun let through). Glass with lower g also lets less light in, so the windows may need to grow.',
    unlocks: ['glazing'],
    goals: [
      {
        label: 'Heating below 5 200 kWh a year',
        short: 'Heating < 5 200 kWh',
        value: (r) => kWh(r.heating),
        ok: (r) => r.heating < 5200,
      },
      { label: 'Enough daylight on both sides', short: 'Daylight both sides', value: daylightValue, ok: daylightOk },
    ],
    insight: {
      title: 'A window is a heat balance',
      text: (b, a) =>
        `Heating went from ${kWh(b.heating)} to ${kWh(a.heating)}. Triple glazing needs about 120 W/m² of sun to break even over a day: a south window on a sunny day gains, a north window never does.`,
      source: 'Slides 16 and 17',
    },
  },
  {
    id: 'paradox',
    title: 'The passive house paradox',
    tag: 'Slide 18 · Insulation and useful sun',
    brief: () => 'Now make the walls, roof and ventilation as good as in a passive house.',
    hint: 'Open “Insulation” and choose Passive house. Then look at the sun card: how much of the sun is still useful?',
    unlocks: ['envelope'],
    guess: {
      question:
        'Guess first: you upgrade to a passive house. What happens to the share of the sun through the windows that is useful as heat?',
      options: [
        { id: 'up', label: 'It goes up' },
        { id: 'same', label: 'It stays the same' },
        { id: 'down', label: 'It goes down' },
      ],
      answer: 'down',
    },
    goals: [
      {
        label: 'Insulation: passive house',
        short: 'Passive house',
        value: (_r, d) => ({ old: '1970s house', code: 'new build', passive: 'passive house' })[d.envelope],
        ok: (_r, d) => d.envelope === 'passive',
      },
    ],
    insight: {
      title: 'The better the house, the less of the sun counts',
      text: (b, a) =>
        `The useful share of the sun fell from ${pct(b.useful)} to ${pct(a.useful)}, and the hours above 26 °C went from ${num(b.overheat)} to ${num(a.overheat)}. The heating season gets shorter, so much of the spring and autumn sun now comes when no heat is needed.`,
      source: 'Slides 18 and 25',
    },
  },
  {
    id: 'cool',
    title: 'Keep it cool',
    tag: 'Rules 4 and 5 · Mass in the sun, shade outside',
    brief: (r) =>
      `Your passive house is too warm: ${num(r.overheatHours)} hours above 26 °C a year. Bring the summer under control without buying more heat in winter.`,
    hint: 'Shade outside the glass, and let the shading move. Put mass where the sun reaches it, and let cool night air carry the heat out.',
    unlocks: ['shading', 'mass', 'summer'],
    goals: [
      {
        label: 'At most 100 hours above 26 °C',
        short: '≤ 100 h above 26 °C',
        value: (r) => `${num(r.overheatHours)} h`,
        ok: (r) => r.overheatHours <= 100,
      },
      {
        label: 'Heating below 2 000 kWh a year',
        short: 'Heating < 2 000 kWh',
        value: (r) => kWh(r.heating),
        ok: (r) => r.heating < 2000,
      },
    ],
    insight: {
      title: 'Shade outside, move it, and use the night',
      text: (b, a) =>
        `From ${num(b.overheat)} to ${num(a.overheat)} hours above 26 °C. Blinds inside the glass keep the heat in the room, and fixed shading also blocks the winter sun. Mass stores the noon sun, and cool night air empties it.`,
      source: 'Slides 19 and 20',
    },
  },
  {
    id: 'master',
    title: 'Master architect',
    tag: 'All six rules, from scratch',
    brief: () =>
      `A new client brings the same sketch: big windows to the north, double glass, no shading. Every control is open. Use the six rules and reach three stars, ${num(STARS[2])} points. The clock is running.`,
    hint: 'Face south, size for daylight, good glass, mass in the sun, shade outside and move it, few north windows. And the passive house needs its summer ventilation.',
    unlocks: [],
    timed: true,
    setup: () => ({ ...START_DESIGN }),
    goals: [
      {
        label: `${num(STARS[2])} points`,
        short: `${num(STARS[2])} points`,
        value: (_r, _d, s) => `${num(s.total)} points`,
        ok: (_r, _d, s) => s.total >= STARS[2],
      },
    ],
    insight: {
      title: 'Three stars',
      text: (b, a) =>
        `From ${num(b.score)} to ${num(a.score)} points${a.seconds ? ` in ${formatTime(a.seconds)}` : ''}, with ${num(a.heating / FLOOR_AREA, 1)} kWh/m² of heating a year. Face south, size for daylight, good glass, mass in the sun, shade outside and move it, few north windows.`,
      source: 'Slide 23',
    },
  },
  {
    id: 'neighbour',
    title: 'A neighbour moves in',
    tag: 'Bonus · Task 1',
    bonus: true,
    brief: () =>
      'A 12 m building goes up 25 m south of your house, as in task 1. It takes your noon sun from mid-October to the end of February. Can you still get three stars?',
    hint: 'The neighbour also darkens the south rooms. Larger south windows bring the daylight back, but not the winter sun.',
    unlocks: ['site'],
    setup: (d) => ({ ...d, site: 'city' }),
    goals: [
      {
        label: 'City plot',
        short: 'City plot',
        value: (_r, d) => (d.site === 'city' ? 'neighbour in place' : 'open field'),
        ok: (_r, d) => d.site === 'city',
      },
      {
        label: `${num(STARS[2])} points`,
        short: `${num(STARS[2])} points`,
        value: (_r, _d, s) => `${num(s.total)} points`,
        ok: (_r, _d, s) => s.total >= STARS[2],
      },
    ],
    insight: {
      title: 'Distance decides the winter sun',
      text: (b, a) =>
        `With the neighbour your house needs ${kWh(a.heating)} of heat. In winter the distance to the next building decides whether the sun reaches a south facade.`,
      source: 'Slides 6 and 7',
    },
  },
];

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const MAIN_MISSIONS = MISSIONS.filter((m) => !m.bonus).length;

export const ALL_CONTROLS: Control[] = ['orientation', 'windows', 'glazing', 'envelope', 'shading', 'mass', 'summer', 'site'];

/** Controls open in a mission: its own and those of every mission before it. */
export function unlockedControls(missionIndex: number, freePlay: boolean): Set<Control> {
  if (freePlay) return new Set(ALL_CONTROLS);
  const set = new Set<Control>();
  for (let i = 0; i <= Math.min(missionIndex, MISSIONS.length - 1); i++) MISSIONS[i].unlocks.forEach((c) => set.add(c));
  return set;
}

/** First mission that opens a control, for the lock labels. */
export function unlockMission(control: Control) {
  return MISSIONS.findIndex((m) => m.unlocks.includes(control));
}
