// Checks the score along the intended path through the missions. Run: npm run playthrough
import { Design, START_DESIGN } from '../src/sim/design';
import { simulate } from '../src/sim/simulate';
import { score } from '../src/game/score';

const show = (label: string, d: Design) => {
  const r = simulate(d);
  const s = score(r);
  console.log(
    label.padEnd(36),
    String(s.total).padStart(4),
    '*'.repeat(s.stars).padEnd(3),
    `heat ${r.heating.toFixed(0).padStart(5)} (${s.heating.toFixed(0)})`,
    `>26 ${r.overheatHours.toFixed(0).padStart(4)} (${s.comfort.toFixed(0)})`,
    `peak ${(r.peakLoad / 1000).toFixed(2)} (${s.peak.toFixed(0)})`,
    `day ${r.daylight.front.toFixed(2)}/${r.daylight.back.toFixed(2)} (${s.daylight.toFixed(0)})`,
    `useful ${(r.usefulShare * 100).toFixed(0)}%`,
  );
  return r;
};
const w = (d: Design, win: Partial<Design['windows']>, rest: Partial<Design> = {}): Design => ({ ...d, ...rest, windows: { ...d.windows, ...win } });

console.log('== M1 face south');
show('start (client sketch)', START_DESIGN);
for (const o of [90, 135, 165, 180, 195, 225, 270]) show(`orientation ${o}`, { ...START_DESIGN, orientation: o });
let d: Design = { ...START_DESIGN, orientation: 180 };

console.log('== M2 windows');
for (const [f, b, g] of [[26, 8, 3], [14, 8, 3], [10, 8, 3], [8, 8, 3], [10, 10, 1], [6, 8, 3], [20, 12, 3]]) show(`front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }));
d = w(d, { front: 10, back: 8, right: 3, left: 3 });

console.log('== M3 glass');
for (const glazing of ['double', 'triple', 'solar', 'quad'] as const) show(glazing, { ...d, glazing });
d = { ...d, glazing: 'triple' };

console.log('== M4 insulation');
for (const envelope of ['old', 'code', 'passive'] as const) show(envelope, { ...d, envelope });
d = { ...d, envelope: 'passive' };

console.log('== M5 keep it cool (passive house, summer airing is standard)');
show('nothing', d);
for (const mass of ['carpet', 'medium', 'heavy'] as const) show(`mass ${mass}`, { ...d, mass });
show('inside blinds', { ...d, shading: 'inside' });
show('outside blinds', { ...d, shading: 'outside' });
for (const oh of [0.5, 1, 1.5]) show(`overhang ${oh}`, { ...d, shading: 'overhang', overhang: oh });
show('inside + heavy', { ...d, shading: 'inside', mass: 'heavy' });
show('outside + carpet', { ...d, shading: 'outside', mass: 'carpet' });
show('outside + medium', { ...d, shading: 'outside', mass: 'medium' });
show('outside + heavy', { ...d, shading: 'outside', mass: 'heavy' });
show('overhang 1.0 + heavy', { ...d, shading: 'overhang', overhang: 1, mass: 'heavy' });
show('overhang 1.5 + heavy', { ...d, shading: 'overhang', overhang: 1.5, mass: 'heavy' });
show('solar glass + heavy', { ...d, glazing: 'solar', mass: 'heavy' });
d = { ...d, shading: 'outside', mass: 'heavy' };

console.log('== M6 tune');
for (const [f, b, g] of [[12, 8, 3], [10, 8, 3], [8, 9, 2], [9, 9, 1], [8, 10, 1]]) show(`front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }));
show('more west glass (6 m² each gable)', w(d, { right: 6, left: 6 }));

console.log('== Bonus city');
for (const [f, b, g] of [[10, 8, 3], [12, 8, 3], [14, 9, 1], [16, 9, 1]]) show(`city front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }, { site: 'city' }));
