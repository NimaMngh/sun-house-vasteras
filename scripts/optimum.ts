// Searches the best design, to set the targets of the last missions. Run: npm run optimum
import { Design, START_DESIGN } from '../src/sim/design';
import { simulate } from '../src/sim/simulate';
import { score } from '../src/game/score';

const site = (process.argv[2] ?? 'open') as Design['site'];
let best: Design = { ...START_DESIGN, orientation: 180, windows: { front: 10, back: 8, right: 3, left: 3 }, glazing: 'triple', envelope: 'passive', shading: 'outside', mass: 'heavy', site };
const s = (d: Design) => score(simulate(d)).total;
let bestScore = s(best);
const moves: ((d: Design) => Design)[] = [];
for (const f of ['front', 'back', 'right', 'left'] as const) for (const dv of [-2, -1, 1, 2]) moves.push((d) => ({ ...d, windows: { ...d.windows, [f]: Math.max(0, Math.min(f === 'front' || f === 'back' ? 30 : 12, d.windows[f] + dv)) } }));
for (const o of [150, 165, 180, 195, 210]) moves.push((d) => ({ ...d, orientation: o }));
for (const g of ['triple', 'quad', 'solar'] as const) moves.push((d) => ({ ...d, glazing: g }));
for (const m of ['medium', 'heavy'] as const) moves.push((d) => ({ ...d, mass: m }));
for (const oh of [0.6, 0.8, 1.0, 1.2]) moves.push((d) => ({ ...d, shading: 'overhang', overhang: oh }));
moves.push((d) => ({ ...d, shading: 'outside' }));
let improved = true;
while (improved) {
  improved = false;
  for (const mv of moves) {
    const d = mv(best);
    const v = s(d);
    if (v > bestScore) { best = d; bestScore = v; improved = true; }
  }
}
const r = simulate(best);
console.log(site, bestScore, JSON.stringify(best), 'heat', r.heating.toFixed(0), 'h26', r.overheatHours, 'peak', r.peakLoad.toFixed(0), 'day', r.daylight.front.toFixed(2), r.daylight.back.toFixed(2), JSON.stringify(score(r)));
