// Checks the score along the intended path through the missions. Run: npm run playthrough
import { Design, START_DESIGN } from '../src/sim/design';
import { simulate } from '../src/sim/simulate';
import { score } from '../src/game/score';

const show = (label: string, d: Design) => {
  const r = simulate(d);
  const s = score(r);
  console.log(
    label.padEnd(40),
    String(s.total).padStart(4), '*'.repeat(s.stars).padEnd(3),
    `heat ${r.heating.toFixed(0).padStart(5)} (${s.heating.toFixed(0)})`,
    `>26 ${r.overheatHours.toFixed(0).padStart(4)} (${s.comfort.toFixed(0)})`,
    `peak ${(r.peakLoad / 1000).toFixed(2)} (${s.peak.toFixed(0)})`,
    `day ${r.daylight.front.toFixed(2)}/${r.daylight.back.toFixed(2)} (${s.daylight.toFixed(0)})`,
    `useful ${(r.usefulShare * 100).toFixed(0)}%  max ${r.maxIndoor.toFixed(1)}`,
  );
  return r;
};
const w = (d: Design, win: Partial<Design['windows']>, rest: Partial<Design> = {}): Design => ({ ...d, ...rest, windows: { ...d.windows, ...win } });

let d: Design = { ...START_DESIGN, windows: { front: 26, right: 3, back: 2, left: 3 } };
console.log('== start');
show('start', d);
console.log('== M1 orientation');
for (const o of [90, 120, 135, 150, 165, 180, 210, 225, 270]) show(`o=${o}`, { ...d, orientation: o });
d = { ...d, orientation: 180 };
console.log('== M2 windows');
for (const [f, b, g] of [[26,2,3],[26,8,3],[20,8,3],[14,8,3],[10,8,3],[8,8,3],[6,8,3],[10,9,2],[10,10,1],[8,10,1],[12,6,4],[26,10,0],[14,9,2]]) show(`front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }));
d = w(d, { front: 12, back: 8, right: 3, left: 3 });
console.log('== M3 glass');
for (const glazing of ['double', 'triple', 'solar', 'quad'] as const) show(glazing, { ...d, glazing });
show('quad + back 10', w(d, { back: 10 }, { glazing: 'quad' }));
show('triple', { ...d, glazing: 'triple' });
d = { ...d, glazing: 'triple' };
console.log('== M4 envelope');
for (const envelope of ['old', 'code', 'passive'] as const) show(envelope, { ...d, envelope });
d = { ...d, envelope: 'passive' };
console.log('== M5 cool');
show('nothing', d);
for (const mass of ['light', 'carpet', 'medium', 'heavy'] as const) show(`mass ${mass}`, { ...d, mass });
for (const shading of ['inside', 'outside'] as const) show(`shading ${shading}`, { ...d, shading });
for (const oh of [0.5, 1, 1.5]) show(`overhang ${oh}`, { ...d, shading: 'overhang', overhang: oh });
show('summer', { ...d, summerMode: true });
show('summer + heavy', { ...d, summerMode: true, mass: 'heavy' });
show('summer + outside', { ...d, summerMode: true, shading: 'outside' });
show('summer + outside + heavy', { ...d, summerMode: true, shading: 'outside', mass: 'heavy' });
show('summer + overhang 1 + heavy', { ...d, summerMode: true, shading: 'overhang', overhang: 1, mass: 'heavy' });
show('summer + overhang 1.5 + heavy', { ...d, summerMode: true, shading: 'overhang', overhang: 1.5, mass: 'heavy' });
show('summer + inside + heavy', { ...d, summerMode: true, shading: 'inside', mass: 'heavy' });
show('summer + solar glass + heavy', { ...d, summerMode: true, glazing: 'solar', mass: 'heavy' });
show('summer + outside + carpet', { ...d, summerMode: true, shading: 'outside', mass: 'carpet' });
d = { ...d, summerMode: true, shading: 'outside', mass: 'heavy' };
console.log('== M6 tune');
for (const [f, b, g] of [[12,8,3],[10,8,3],[8,9,2],[8,10,1],[7,10,1],[6,10,1],[6,11,0],[5,11,0],[9,9,1]]) show(`front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }));
for (const [f, b, g] of [[8,11,1],[7,11,1],[6,12,0],[9,10,1]]) show(`quad front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }, { glazing: 'quad' }));
console.log('== bonus city');
for (const [f, b, g] of [[8,10,1],[12,10,1],[14,9,1],[16,9,1],[20,10,1]]) show(`city front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }, { site: 'city' }));
for (const [f, b, g] of [[12,11,1],[14,11,1],[16,11,1]]) show(`city quad front ${f} back ${b} gables ${g}`, w(d, { front: f, back: b, right: g, left: g }, { site: 'city', glazing: 'quad' }));
console.log('== extra M5 checks');
const p5 = { ...d, summerMode: false, shading: 'none' as const, mass: 'light' as const, windows: { front: 12, back: 8, right: 3, left: 3 } };
show('summer + outside + medium', { ...p5, summerMode: true, shading: 'outside', mass: 'medium' });
show('summer + outside + light', { ...p5, summerMode: true, shading: 'outside', mass: 'light' });
show('summer + outside + carpet', { ...p5, summerMode: true, shading: 'outside', mass: 'carpet' });
show('outside + heavy (no summer)', { ...p5, shading: 'outside', mass: 'heavy' });
show('summer + overhang 1.2 + heavy', { ...p5, summerMode: true, shading: 'overhang', overhang: 1.2, mass: 'heavy' });
show('summer + overhang 1 + heavy, front 10', w(p5, { front: 10 }, { summerMode: true, shading: 'overhang', overhang: 1, mass: 'heavy' }));
show('M5 best, west gables 6', w(p5, { right: 6, left: 6, front: 9 }, { summerMode: true, shading: 'outside', mass: 'heavy' }));
