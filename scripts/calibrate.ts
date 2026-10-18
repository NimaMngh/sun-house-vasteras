// Checks the generated weather and the house model against the lecture numbers.
// Run with: npm run calibrate

import { GHI_MONTH, HOURS, MONTHS, T_MONTH, getWeather } from '../src/sim/weather';
import { Design, START_DESIGN } from '../src/sim/design';
import { simulate } from '../src/sim/simulate';

const w = getWeather();
const D2R = Math.PI / 180;

function surface(tiltDeg: number, azFromSouthDeg: number) {
  const beta = tiltDeg * D2R;
  const psi = azFromSouthDeg * D2R;
  const monthly = new Array(12).fill(0);
  for (let t = 0; t < HOURS; t++) {
    if (w.ghi[t] <= 0) continue;
    const alt = w.sunAlt[t];
    const cosT = Math.sin(alt) * Math.cos(beta) + Math.cos(alt) * Math.sin(beta) * Math.cos(w.sunAz[t] - psi);
    const beam = alt > 0 && cosT > 0 ? w.dni[t] * cosT : 0;
    const val = beam + w.dhi[t] * (1 + Math.cos(beta)) / 2 + w.ghi[t] * 0.2 * (1 - Math.cos(beta)) / 2;
    monthly[w.month[t]] += val / 1000;
  }
  return monthly;
}

const fmt = (a: number[]) => a.map((x) => x.toFixed(0).padStart(4)).join('');
const total = (a: number[]) => a.reduce((x, y) => x + y, 0);
const heatingSeason = (a: number[]) => a[0] + a[1] + a[2] + a[3] + a[9] + a[10] + a[11];

console.log('month          ' + MONTHS.map((m) => m.padStart(4)).join(''));
console.log('slide flat     ' + fmt(GHI_MONTH), ' year', total(GHI_MONTH));
const flat = surface(0, 0);
console.log('model flat     ' + fmt(flat), ' year', total(flat).toFixed(0));
let dif = 0;
let glo = 0;
for (let t = 0; t < HOURS; t++) {
  dif += w.dhi[t];
  glo += w.ghi[t];
}
console.log('diffuse share  ' + (dif / glo).toFixed(2), '(slide 4: about half)');
const rows: [string, number, number, number, number][] = [
  ['40° south', 40, 0, 1190, 0],
  ['south wall', 90, 0, 905, 402],
  ['SE/SW wall', 90, -45, 844, 330],
  ['E/W wall', 90, -90, 665, 198],
  ['NE/NW wall', 90, -135, 468, 116],
  ['north wall', 90, 180, 378, 96],
];
for (const [name, tilt, az, slideYear, slideWinter] of rows) {
  const m = surface(tilt, az);
  console.log(
    name.padEnd(15) + fmt(m),
    ' year',
    total(m).toFixed(0),
    `(slide ${slideYear})`,
    ' Oct-Apr',
    heatingSeason(m).toFixed(0),
    slideWinter ? `(slide ${slideWinter})` : '',
  );
}

const tm = new Array(12).fill(0);
const cnt = new Array(12).fill(0);
let tmin = 99;
let tmax = -99;
for (let t = 0; t < HOURS; t++) {
  tm[w.month[t]] += w.temp[t];
  cnt[w.month[t]]++;
  tmin = Math.min(tmin, w.temp[t]);
  tmax = Math.max(tmax, w.temp[t]);
}
console.log('T normal       ' + T_MONTH.map((x) => x.toFixed(1).padStart(5)).join(''));
console.log('T model        ' + tm.map((x, i) => (x / cnt[i]).toFixed(1).padStart(5)).join(''));
console.log('T min/max', tmin.toFixed(1), tmax.toFixed(1));

function show(label: string, d: Design) {
  const t0 = performance.now();
  const r = simulate(d);
  const ms = performance.now() - t0;
  console.log(
    label.padEnd(34),
    'heat',
    r.heating.toFixed(0).padStart(6),
    'kWh',
    (r.heating / 150).toFixed(1).padStart(5),
    '/m2  >26:',
    r.overheatHours.toFixed(0).padStart(5),
    'h  max',
    r.maxIndoor.toFixed(1),
    ' peak',
    (r.peakLoad / 1000).toFixed(2),
    'kW',
    (r.peakLoad / 150).toFixed(1),
    'W/m2  sun',
    r.solar.toFixed(0).padStart(5),
    'useful',
    (100 * r.usefulShare).toFixed(0) + '%',
    ' daylight',
    r.daylight.front.toFixed(2),
    r.daylight.back.toFixed(2),
    ` ${ms.toFixed(0)} ms`,
  );
  return r;
}

const base = START_DESIGN;
const v = (patch: Partial<Design>): Design => ({ ...base, ...patch, windows: { ...base.windows, ...(patch.windows ?? {}) } });

console.log('\n--- start design and orientation ---');
for (const o of [0, 45, 90, 135, 150, 165, 180, 195, 210, 225, 270, 315]) show(`start, front faces ${o}`, v({ orientation: o }));

console.log('\n--- envelopes, south, good windows ---');
const good: Partial<Design> = { orientation: 180, windows: { front: 14, right: 2, back: 9, left: 2 } };
for (const env of ['old', 'code', 'passive'] as const) {
  for (const glazing of ['double', 'triple', 'solar', 'quad'] as const) show(`${env} ${glazing}`, v({ ...good, envelope: env, glazing }));
}

console.log('\n--- passive, triple, south: overheating measures ---');
const p: Partial<Design> = { ...good, envelope: 'passive', glazing: 'triple' };
show('nothing', v(p));
show('heavy', v({ ...p, mass: 'heavy' }));
show('carpet', v({ ...p, mass: 'carpet' }));
show('inside blinds', v({ ...p, shading: 'inside' }));
show('outside blinds', v({ ...p, shading: 'outside' }));
show('overhang 0.5', v({ ...p, shading: 'overhang', overhang: 0.5 }));
show('overhang 1.0', v({ ...p, shading: 'overhang', overhang: 1.0 }));
show('overhang 1.5', v({ ...p, shading: 'overhang', overhang: 1.5 }));
show('outside blinds', v({ ...p, shading: 'outside' }));
show('outside + heavy', v({ ...p, shading: 'outside', mass: 'heavy' }));
show('overhang 1 + heavy', v({ ...p, shading: 'overhang', overhang: 1, mass: 'heavy' }));
show('quad, outside, heavy', v({ ...p, glazing: 'quad', windows: { front: 15, right: 2, back: 10, left: 2 }, shading: 'outside', mass: 'heavy' }));
show('city: same', v({ ...p, shading: 'outside', mass: 'heavy', site: 'city' }));

console.log('\n--- passive, best measures, window sizes ---');
for (const front of [6, 10, 14, 20, 26, 30]) {
  show(`front ${front}`, v({ ...p, windows: { front, right: 2, back: 9, left: 2 }, shading: 'outside', mass: 'heavy' }));
}
for (const back of [4, 8, 12, 20]) {
  show(`back ${back}`, v({ ...p, windows: { front: 14, right: 2, back, left: 2 }, shading: 'outside', mass: 'heavy' }));
}
