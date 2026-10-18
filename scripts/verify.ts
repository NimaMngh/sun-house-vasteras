// Checks the calculation engine against the lecture's answer key, against
// physics that must hold exactly, and against the claims on the slides.
// Run: npm run verify   (exits with an error if any check fails)

import { Design, ENVELOPE, FLOOR_AREA, GLAZING, MASS, START_DESIGN, type Envelope, type Mass } from '../src/sim/design';
import { simulate, type Result } from '../src/sim/simulate';
import { GHI_MONTH, HOURS, getWeather, noonAltitude, type Weather } from '../src/sim/weather';
import { behindObstacle, overhangShade } from '../src/sim/geometry';

const D2R = Math.PI / 180;
let failed = 0;
let section = '';

function check(name: string, expected: string, model: number | string, ok: boolean) {
  if (!ok) failed++;
  const value = typeof model === 'number' ? model.toFixed(Math.abs(model) >= 100 ? 0 : 2) : model;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} lecture/expected: ${expected.padEnd(16)} model: ${value}`);
}
function head(title: string) {
  section = title;
  console.log(`\n${section}`);
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

const BASE: Design = {
  ...START_DESIGN,
  orientation: 180,
  windows: { front: 12, right: 3, back: 8, left: 3 },
  glazing: 'triple',
};
type Patch = Partial<Omit<Design, 'windows'>> & { windows?: Partial<Design['windows']> };
const with_ = (patch: Patch, d: Design = BASE): Design => ({ ...d, ...patch, windows: { ...d.windows, ...(patch.windows ?? {}) } });

/** The real calendar, but a constant outdoor temperature and no sun. */
function constantWeather(temp: number): Weather {
  const w = getWeather();
  return {
    ...w,
    temp: new Float32Array(HOURS).fill(temp),
    ghi: new Float32Array(HOURS),
    dhi: new Float32Array(HOURS),
    dni: new Float32Array(HOURS),
    sunAlt: new Float32Array(HOURS).fill(-1),
  };
}

// ---------------------------------------------------------------------------
head('Sun position (slides 6 and 7, answer key)');
check('noon height on 21 June', '53.8°', noonAltitude(172), near(noonAltitude(172), 53.8, 0.1));
check('noon height on 20 October', '19.0°', noonAltitude(293), near(noonAltitude(293), 19.0, 0.1));
check('noon height on 21 December', '7.0°', noonAltitude(355), near(noonAltitude(355), 7.0, 0.1));
const roof = Math.atan(10 / 25) / D2R;
check('height angle of the new building, tan α = 10/25', '21.8°', roof, near(roof, 21.8, 0.05));
let firstAutumn = 0;
for (let n = 172; n <= 365 && !firstAutumn; n++) if (noonAltitude(n) < roof) firstAutumn = n;
let lastSpring = 0;
for (let n = 1; n <= 172; n++) if (noonAltitude(n) < roof) lastSpring = n;
check('first day without noon sun (13 October = day 286)', 'day 286', `day ${firstAutumn}`, near(firstAutumn, 286, 1));
check('last day without noon sun (28 February = day 59)', 'day 59', `day ${lastSpring}`, near(lastSpring, 59, 1));
const tan = (deg: number) => Math.tan(deg * D2R);
check('neighbour hides the sun at noon on 20 October', 'hidden', behindObstacle(tan(noonAltitude(293)), 1, 10, 25) ? 'hidden' : 'visible', behindObstacle(tan(noonAltitude(293)), 1, 10, 25));
check('neighbour does not hide the sun on 21 March', 'visible', behindObstacle(tan(noonAltitude(80)), 1, 10, 25) ? 'hidden' : 'visible', !behindObstacle(tan(noonAltitude(80)), 1, 10, 25));

// ---------------------------------------------------------------------------
head('Overhang (slides 10 and 11, answer key)');
const june = tan(noonAltitude(172));
const october = tan(noonAltitude(293));
const march = tan(noonAltitude(80));
const P = 1.5 / june;
check('depth that shades the whole window in June, P = 1.5 / tan 53.8°', '1.10 m', P, near(P, 1.1, 0.01));
check('shaded share of the window at noon 21 June', '100 %', overhangShade(P, 0, 1.5, june) * 100, near(overhangShade(P, 0, 1.5, june), 1, 1e-9));
check('shaded height today, 1.10 · tan 19°', '0.38 m', overhangShade(1.1, 0, 1.5, october) * 1.5, near(overhangShade(1.1, 0, 1.5, october) * 1.5, 0.38, 0.005));
check('with a gap, P = 1.47 m, G = 0.51 m: shade in June', '1.50 m', overhangShade(1.47, 0.51, 1.5, june) * 1.5, near(overhangShade(1.47, 0.51, 1.5, june) * 1.5, 1.5, 0.01));
check('with a gap: shade on 20 October', '0.00 m', overhangShade(1.47, 0.51, 1.5, october) * 1.5, near(overhangShade(1.47, 0.51, 1.5, october) * 1.5, 0, 0.01));
check('with a gap: shade on 21 March', '0.34 m', overhangShade(1.47, 0.51, 1.5, march) * 1.5, near(overhangShade(1.47, 0.51, 1.5, march) * 1.5, 0.34, 0.01));

// ---------------------------------------------------------------------------
head('Window heat balance (slides 16 to 18, answer key, with the app’s glass data)');
const breakEven = (u: number, g: number) => (u * 25 * 24) / (g * 8);
check('loss of 1 m² triple glazing over 24 h at 25 K', '480 Wh', GLAZING.triple.u * 25 * 24, near(GLAZING.triple.u * 25 * 24, 480, 0.5));
check('break-even sun for triple glazing over 8 h', '120 W/m²', breakEven(GLAZING.triple.u, GLAZING.triple.g), near(breakEven(GLAZING.triple.u, GLAZING.triple.g), 120, 0.5));
check('break-even sun for quadruple glazing (U 0.5, g 0.4)', '94 W/m²', breakEven(GLAZING.quad.u, GLAZING.quad.g), near(breakEven(GLAZING.quad.u, GLAZING.quad.g), 94, 0.5));

// ---------------------------------------------------------------------------
head('Weather against backup slide 2 (Stockholm, Hastings and Wall 2007)');
const w = getWeather();
const monthly = new Array(12).fill(0);
for (let t = 0; t < HOURS; t++) monthly[w.month[t]] += w.ghi[t] / 1000;
const worstMonth = Math.max(...monthly.map((v, i) => Math.abs(v - GHI_MONTH[i])));
check('flat roof, every month (largest difference)', '0 kWh/m²', worstMonth, worstMonth < 0.5);
function surface(tiltDeg: number, azFromSouthDeg: number, months?: number[]) {
  const beta = tiltDeg * D2R;
  const psi = azFromSouthDeg * D2R;
  let total = 0;
  for (let t = 0; t < HOURS; t++) {
    if (w.ghi[t] <= 0 || (months && !months.includes(w.month[t]))) continue;
    const alt = w.sunAlt[t];
    const c = Math.sin(alt) * Math.cos(beta) + Math.cos(alt) * Math.sin(beta) * Math.cos(w.sunAz[t] - psi);
    total += (alt > 0 && c > 0 ? w.dni[t] * c : 0) + (w.dhi[t] * (1 + Math.cos(beta))) / 2 + (w.ghi[t] * 0.2 * (1 - Math.cos(beta))) / 2;
  }
  return total / 1000;
}
const winter = [0, 1, 2, 3, 9, 10, 11];
for (const [name, tilt, az, slide] of [
  ['40° south roof, year', 40, 0, 1190],
  ['south wall, year', 90, 0, 905],
  ['east or west wall, year', 90, -90, 665],
  ['north wall, year', 90, 180, 378],
] as const) {
  const v = surface(tilt, az);
  check(`${name} (within 10 %)`, `${slide} kWh/m²`, v, rel(v, slide) <= 0.1);
}
const ratio = surface(90, 0, winter) / surface(90, 180, winter);
check('south wall / north wall, October to April (slide 9)', 'about 4', ratio, ratio > 3.5 && ratio < 4.5);

// ---------------------------------------------------------------------------
head('Hourly model against hand calculations (steady state, no sun)');
// At a constant −20 °C with no sun, the hour-by-hour solver must settle on the
// exact steady state of its own network: room air held at 21 °C, connected to
// the outside through the ventilation (H_ve) and, via the room surfaces
// (H_is = 3.45 W/m²K · 4.5 · floor area), through windows and walls (H_tr):
//   P = 41 K · [H_ve + H_is·H_tr / (H_is + H_tr)]
// The slide 23 formula P = H · 41 K treats the surfaces as if they were at
// 21 °C too, so it gives 1.5 to 3 % more. Both are standard methods
// (ISO 13790 hourly, EN 12831 design load); the app shows the slide 23 value.
const H_IS = 3.45 * 4.5 * FLOOR_AREA;
const network = (r: Result) => {
  const hTr = r.loss.windows + r.loss.opaque;
  return { hTr, g: r.loss.ventilation + (H_IS * hTr) / (H_IS + hTr) };
};
for (const envelope of ['old', 'code', 'passive'] as Envelope[]) {
  for (const mass of ['light', 'heavy'] as Mass[]) {
    const r = simulate(with_({ envelope, mass }), { weather: constantWeather(-20), internalGains: () => 0 });
    const mean = (r.heating * 1000) / HOURS;
    const exact = network(r).g * 41;
    check(`${envelope}, ${mass}: hourly solver = exact steady state`, `${exact.toFixed(0)} W`, mean, rel(mean, exact) < 0.0005);
    check(`${envelope}, ${mass}: … and the slide 23 formula H · 41 K (within 3 %)`, `${r.peakLoad.toFixed(0)} W`, mean, rel(mean, r.peakLoad) < 0.03);
  }
}
{
  // 600 W from people and appliances, split as in ISO 13790: half to the air,
  // the rest between the mass node and the surface node (less the share on the
  // window panes). Exact steady state of the three nodes with the air at 21 °C:
  //   heating = 41·G − Φ_air − H_is/(H_is + H_tr) · (Φ_surf + Φ_mass · H_ms/(H_ms + H_em))
  const d = with_({ envelope: 'passive' });
  const r = simulate(d, { weather: constantWeather(-20), internalGains: () => 600 });
  const mean = (r.heating * 1000) / HOURS;
  const { hTr, g } = network(r);
  const at = 4.5 * FLOOR_AREA;
  const am = MASS[d.mass].am * FLOOR_AREA;
  const hMs = 9.1 * am;
  const hEm = 1 / (1 / r.loss.opaque - 1 / hMs);
  const phiMass = (am / at) * 300;
  const phiSurf = (1 - am / at - r.loss.windows / (9.1 * at)) * 300;
  const exact = 41 * g - 300 - (H_IS / (H_IS + hTr)) * (phiSurf + (phiMass * hMs) / (hMs + hEm));
  check('with 600 W from people and appliances: exact steady state', `${exact.toFixed(0)} W`, mean, rel(mean, exact) < 0.0005);
}
{
  // slide 23: 10 m² of wall becomes window
  const env = ENVELOPE.passive;
  const a = simulate(with_({ envelope: 'passive' }));
  const b = simulate(with_({ envelope: 'passive', windows: { front: 22 } }));
  const expected = (GLAZING.triple.u - env.uWall * (1 + env.bridges)) * 10 * 41;
  check('10 m² more window: ΔP = (U_window − U_wall) · A · 41 K', `${expected.toFixed(0)} W`, b.peakLoad - a.peakLoad, near(b.peakLoad - a.peakLoad, expected, 0.01));
}

// ---------------------------------------------------------------------------
head('Energy balance of the whole year (heat in = heat out + heat stored)');
const designs: [string, Design][] = [
  ['client sketch (north, double glass, light)', START_DESIGN],
  ['1970s house, south', with_({ envelope: 'old' })],
  ['passive house, no shading', with_({ envelope: 'passive' })],
  ['passive, blinds outside, heavy, summer air', with_({ envelope: 'passive', shading: 'outside', mass: 'heavy' })],
  ['passive, overhang 1.2 m, neighbour', with_({ envelope: 'passive', shading: 'overhang', overhang: 1.2, site: 'city' })],
];
const results = new Map<string, Result>();
for (const [name, d] of designs) {
  const r = simulate(d);
  results.set(name, r);
  const b = r.balance;
  const into = b.heating + b.internal + b.sun;
  const out = b.windows + b.opaque + b.ventilation + b.stored;
  check(`${name}: in − out − stored`, '0 %', `${((100 * (into - out)) / into).toExponential(1)} %`, Math.abs(into - out) / into < 1e-6);
}

// ---------------------------------------------------------------------------
head('What the lecture says, reproduced by the hourly model');
const heat = (d: Design) => simulate(d).heating;
const hot = (d: Design) => simulate(d).overheatHours;
{
  const old = simulate(with_({ envelope: 'old', glazing: 'double' }));
  check('the house of 6 October: about 20 000 kWh a year (slide 2)', '20 000 kWh', old.heating, old.heating > 15000 && old.heating < 25000);
}
{
  const south = heat({ ...START_DESIGN, orientation: 180 });
  const north = heat(START_DESIGN);
  check('big windows to the south need less heat than to the north (rule 1, slide 9)', 'south < north', `${south.toFixed(0)} < ${north.toFixed(0)}`, south < north);
}
{
  const p: Design = with_({ envelope: 'passive' });
  const base = heat(p);
  const moreSouth = heat(with_({ windows: { front: 18 } }, p)) - base;
  const moreNorth = heat(with_({ windows: { back: 14 } }, p)) - base;
  check('6 m² more north glass costs more heat than 6 m² south (rule 6, slide 24)', 'north ≫ south', `${moreNorth.toFixed(0)} vs ${moreSouth.toFixed(0)} kWh`, moreNorth > 2 * moreSouth);
}
{
  // Facing south, the right gable faces west and the left gable east. The west
  // sun arrives in the warm afternoon, so the room gets hotter than with the
  // same glass on the east (slide 24, rule 6). The hours above 26 °C are about
  // equal, because the morning sun also warms a light house all day.
  const p: Design = with_({ envelope: 'passive' });
  const west = simulate(with_({ windows: { right: 9 } }, p)).maxIndoor;
  const east = simulate(with_({ windows: { left: 9 } }, p)).maxIndoor;
  check('the room gets hotter with west windows than with east windows (rule 6, slide 24)', 'west > east', `${west.toFixed(1)} > ${east.toFixed(1)} °C`, west > east + 0.2);
}
{
  const u = (envelope: Envelope) => simulate(with_({ envelope })).usefulShare;
  const [o, c, p] = [u('old'), u('code'), u('passive')];
  check('useful share of the sun falls with better insulation (slide 19)', 'old > new > passive', `${(o * 100).toFixed(0)} > ${(c * 100).toFixed(0)} > ${(p * 100).toFixed(0)} %`, o > c && c > p);
}
{
  // slide 19: the heating season shrinks from October–April to November–March.
  // A month belongs to the season when it carries at least 5 % of the year's heating.
  const season = (envelope: Envelope) => {
    const r = simulate(with_({ envelope }));
    return r.heatingMonthly.map((v) => v / r.heating >= 0.05);
  };
  const names = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const label = (m: boolean[]) => names.filter((_, i) => m[i]).join('');
  const isSeason = (m: boolean[], first: number[]) => m.every((on, i) => on === first.includes(i));
  const old = season('old');
  const passive = season('passive');
  check('the heating season of the 1970s house is October to April (slide 19)', 'Oct–Apr', label(old), isSeason(old, [0, 1, 2, 3, 9, 10, 11]));
  check('the heating season of the passive house is November to March (slide 19)', 'Nov–Mar', label(passive), isSeason(passive, [0, 1, 2, 10, 11]));
}
{
  const p: Design = with_({ envelope: 'passive' });
  const none = hot(p);
  const outside = hot(with_({ shading: 'outside' }, p));
  const inside = hot(with_({ shading: 'inside' }, p));
  const newBuild = hot(with_({ envelope: 'code' }));
  check('a passive house overheats more than a new build (slide 19)', 'passive > new build', `${none} > ${newBuild} h`, none > newBuild);
  check('a blind outside beats a blind inside (slide 21)', 'inside > outside', `${inside} > ${outside} h`, inside > outside);
  check('a blind outside removes most of the overheating (slide 21)', 'outside < none / 3', `${outside} vs ${none} h`, outside < none / 3);
  // movable blinds keep the winter sun: little extra heating compared with no blinds
  const costOutside = heat(with_({ shading: 'outside' }, p)) - heat(p);
  const costOverhang = heat(with_({ shading: 'overhang', overhang: 1.5 }, p)) - heat(p);
  check('a movable blind costs less winter heat than a deep fixed overhang (slides 11, 21)', 'blind < overhang', `${costOutside.toFixed(0)} < ${costOverhang.toFixed(0)} kWh`, costOutside < costOverhang);
}
{
  const light = hot(with_({ envelope: 'passive', shading: 'outside', mass: 'light' }));
  const carpet = hot(with_({ envelope: 'passive', shading: 'outside', mass: 'carpet' }));
  const heavy = hot(with_({ envelope: 'passive', shading: 'outside', mass: 'heavy' }));
  check('exposed mass beats mass under carpet beats light (rule 4, slide 20)', 'heavy < carpet < light', `${heavy} < ${carpet} < ${light}`, heavy < carpet && carpet < light);
}
{
  const a = simulate(with_({ envelope: 'passive' }));
  const b = simulate(with_({ envelope: 'passive' }));
  check('same design, same answer (fixed weather year)', 'identical', a.heating === b.heating && a.overheatHours === b.overheatHours ? 'identical' : 'different', a.heating === b.heating && a.overheatHours === b.overheatHours);
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
if (failed) process.exit(1);
