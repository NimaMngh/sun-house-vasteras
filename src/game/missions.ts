// The missions follow the six rules of slide 24, plus the heating season of
// slide 19 that the class discusses right after the app (slide 26).
//
// Each mission shows only what it needs (its `stage`) and adds more as the
// student learns: first one number and one control, in the last missions the
// whole picture.

import { Design, FLOOR_AREA, START_DESIGN } from '../sim/design';
import type { Result } from '../sim/simulate';
import { ALL_PARTS, STARS, type Part, type Score } from './score';
import { num, pct } from './format';

export type Control = 'orientation' | 'windows' | 'glazing' | 'envelope' | 'shading' | 'mass' | 'site';
export type Metric = Part | 'useful';
export type ChartLevel = 'none' | 'year' | 'season' | 'all';

/** What is on the screen in a mission. */
export interface Stage {
  /** tiles in the top bar */
  metrics: Metric[];
  /** the ratings that count in the score */
  parts: Part[];
  charts: ChartLevel;
  /** the card with the sun through the windows and the useful share */
  sun: boolean;
  /** the four ratings with their points */
  breakdown: boolean;
  /** the coach line under the mission */
  coach: boolean;
}

export const FULL_STAGE: Stage = {
  metrics: ['heating', 'comfort', 'daylight', 'peak'],
  parts: ALL_PARTS,
  charts: 'all',
  sun: true,
  breakdown: true,
  coach: true,
};

const CORE: Part[] = ['heating', 'daylight', 'peak'];

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
  value: (r: Result, d: Design, s: Score) => string;
  ok: (r: Result, d: Design, s: Score) => boolean;
}

export type Guess = 'up' | 'same' | 'down';

export interface Mission {
  id: string;
  title: string;
  /** the rule or slide the mission trains */
  tag: string;
  brief: (r: Result) => string;
  hint: string;
  /** controls this mission adds */
  unlocks: Control[];
  stage: Stage;
  goals: Goal[];
  /** a guess the student makes before the controls open */
  guess?: { question: string; after: string; options: { id: Guess; label: string }[]; answer: Guess };
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
const pointsGoal = (target: number): Goal => ({
  label: `${num(target)} points`,
  value: (_r, _d, s) => `${num(s.total)} points`,
  ok: (_r, _d, s) => s.total >= target,
});
/** The best house with the neighbour reaches 955; the Mission 6 design gets 932 there, so the south windows must grow. */
const BONUS_TARGET = 945;

export const MISSIONS: Mission[] = [
  {
    id: 'south',
    title: 'Face south',
    tag: 'Rule 1',
    brief: () => 'The client’s big windows face north. Turn the house so they face south.',
    hint: 'From October to April a south window gets four times the sun of a north window (slide 9). Drag the compass on the picture, or use the slider.',
    unlocks: ['orientation'],
    stage: { metrics: ['heating'], parts: ['heating'], charts: 'none', sun: false, breakdown: false, coach: false },
    goals: [{ label: 'Heating below 6 300 kWh a year', value: (r) => kWh(r.heating), ok: (r) => r.heating < 6300 }],
    insight: {
      title: 'Plenty of sun, but at the wrong time',
      text: (b, a) =>
        `Facing south cut the heating by ${-change(b.heating, a.heating)} %. The same sun also comes in summer, when nobody needs heat. More on that in mission 5.`,
      source: 'Slides 2 and 9',
    },
  },
  {
    id: 'daylight',
    title: 'Size for daylight',
    tag: 'Rules 2 and 6',
    brief: () => 'The rooms at the back are too dark and the glass wall at the front is huge. Resize the windows.',
    hint: 'Each side needs glass of about 10 % of its floor area. Extra glass costs heating power on the coldest day (slide 23).',
    unlocks: ['windows'],
    stage: { metrics: CORE, parts: CORE, charts: 'none', sun: false, breakdown: false, coach: false },
    goals: [
      { label: 'Daylight on both sides', value: daylightValue, ok: daylightOk },
      { label: 'Peak heat below 4.7 kW at −20\u00a0°C', value: (r) => kW(r.peakLoad), ok: (r) => r.peakLoad < 4700 },
    ],
    insight: {
      title: 'As large as daylight needs',
      text: (b, a) =>
        `The heating system needs ${num(b.peak - a.peak)} W less on the coldest day. On that day there is no sun to pay for the glass.`,
      source: 'Slides 23 and 24',
    },
  },
  {
    id: 'glass',
    title: 'Good glass',
    tag: 'Rule 3',
    brief: () => 'The windows still have old double glazing. Choose better glass and keep the daylight.',
    hint: 'Triple glazing: U ≤ 0.8 and g ≈ 0.5 (slide 24). Glass that lets in less light may need larger windows.',
    unlocks: ['glazing'],
    stage: { metrics: CORE, parts: CORE, charts: 'none', sun: false, breakdown: false, coach: false },
    goals: [
      { label: 'Heating below 5 200 kWh a year', value: (r) => kWh(r.heating), ok: (r) => r.heating < 5200 },
      { label: 'Daylight on both sides', value: daylightValue, ok: daylightOk },
    ],
    insight: {
      title: 'A window is a heat balance',
      text: (b, a) =>
        `Heating went from ${kWh(b.heating)} to ${kWh(a.heating)}. A triple glazed window breaks even at about 120 W/m² of sun: a sunny south window gains heat, a grey day or a north window does not.`,
      source: 'Slides 16 to 18',
    },
  },
  {
    id: 'paradox',
    title: 'The passive house paradox',
    tag: 'Slide 19',
    brief: () => 'Give the house the walls, roof and ventilation of a passive house.',
    hint: 'Choose Passive house under Insulation and watch the useful sun at the top.',
    unlocks: ['envelope'],
    stage: { metrics: [...CORE, 'useful'], parts: CORE, charts: 'year', sun: true, breakdown: false, coach: false },
    guess: {
      question: 'Guess first: the house becomes a passive house. What happens to the useful share of the sun?',
      after: 'Noted. Now choose Passive house under Insulation.',
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
        value: (_r, d) => ({ old: '1970s house', code: 'new build', passive: 'passive house' })[d.envelope],
        ok: (_r, d) => d.envelope === 'passive',
      },
    ],
    insight: {
      title: 'A better house has a shorter heating season',
      text: (b, a) =>
        `The useful share of the sun fell from ${pct(b.useful)} to ${pct(a.useful)}: much of the spring and autumn sun now comes when no heat is needed.` +
        (a.overheat > b.overheat ? ` The room is also above 26 °C for ${num(a.overheat)} hours, up from ${num(b.overheat)}.` : ''),
      source: 'Slides 19 and 26',
    },
  },
  {
    id: 'cool',
    title: 'Keep it cool',
    tag: 'Rules 4 and 5',
    brief: (r) => `Your passive house is above 26 °C for ${num(r.overheatHours)} hours a year. Cool it without buying more heat.`,
    hint: 'Shade outside the glass, and make the shading movable (slide 21). Put mass where the sun reaches it (slide 20).',
    unlocks: ['shading', 'mass'],
    stage: { metrics: ['heating', 'comfort', 'daylight', 'peak'], parts: ALL_PARTS, charts: 'season', sun: true, breakdown: false, coach: false },
    goals: [
      { label: 'At most 100 hours above 26\u00a0°C', value: (r) => `${num(r.overheatHours)} h`, ok: (r) => r.overheatHours <= 100 },
      { label: 'Heating below 2 000 kWh a year', value: (r) => kWh(r.heating), ok: (r) => r.heating < 2000 },
    ],
    insight: {
      title: 'Shade outside, and keep mass in the sun',
      text: (b, a) =>
        `From ${num(b.overheat)} to ${num(a.overheat)} hours above 26 °C. A blind outside keeps the heat outside, a blind inside leaves it in the room. Mass stores the heat of the day for the night.`,
      source: 'Slides 20 and 21',
    },
  },
  {
    id: 'master',
    title: 'Master architect',
    tag: 'All six rules',
    brief: () =>
      `A new client, the same sketch: big windows to the north, double glass, no shading. Use the six rules to reach three stars, ${num(STARS[2])} points. The clock is running.`,
    hint: 'Face south, size for daylight, triple glass, mass in the sun, shade outside and move it, few north and west windows (slide 24).',
    unlocks: [],
    timed: true,
    stage: FULL_STAGE,
    setup: () => ({ ...START_DESIGN }),
    goals: [pointsGoal(STARS[2])],
    insight: {
      title: 'Three stars',
      text: (b, a) =>
        `From ${num(b.score)} to ${num(a.score)} points${a.seconds ? ` in ${formatTime(a.seconds)}` : ''}, with ${num(a.heating / FLOOR_AREA, 1)} kWh/m² of heating a year. That is the passive solar design of slide 24.`,
      source: 'Slide 24',
    },
  },
  {
    id: 'neighbour',
    title: 'A neighbour moves in',
    tag: 'Bonus · Task 1',
    bonus: true,
    brief: () =>
      'A 12 m building goes up 25 m south of your house, as in task 1. It hides your noon sun from mid-October to the end of February. How close to the top can you still get?',
    hint: 'The neighbour also darkens the south rooms. Larger south windows bring the daylight back, but not the winter sun.',
    unlocks: ['site'],
    stage: FULL_STAGE,
    setup: (d) => ({ ...d, site: 'city' }),
    goals: [
      {
        label: 'City plot',
        value: (_r, d) => (d.site === 'city' ? 'neighbour in place' : 'open field'),
        ok: (_r, d) => d.site === 'city',
      },
      pointsGoal(BONUS_TARGET),
    ],
    insight: {
      title: 'Distance decides the winter sun',
      text: (_b, a) =>
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

export const ALL_CONTROLS: Control[] = ['orientation', 'windows', 'glazing', 'envelope', 'shading', 'mass', 'site'];

/** What is on the screen: the mission's stage, or everything in free design. */
export function stageOf(missionIndex: number, freePlay: boolean): Stage {
  return freePlay ? FULL_STAGE : MISSIONS[Math.min(missionIndex, MISSIONS.length - 1)].stage;
}

/** Controls open in a mission: its own and those of every mission before it. */
export function unlockedControls(missionIndex: number, freePlay: boolean): Set<Control> {
  if (freePlay) return new Set(ALL_CONTROLS);
  const set = new Set<Control>();
  for (let i = 0; i <= Math.min(missionIndex, MISSIONS.length - 1); i++) MISSIONS[i].unlocks.forEach((c) => set.add(c));
  return set;
}
