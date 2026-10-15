// Hourly heat balance of the house over a whole year.
//
// One thermal zone, the 5R1C network of ISO 13790 (simple hourly method):
// air, inner surfaces and thermal mass are three nodes, solar and internal gains
// are split between them, and the heating keeps the air at 21 °C. There is no
// cooling: in summer the house floats, and every hour above 26 °C counts.

import {
  Design,
  ENVELOPE,
  FACADES,
  FLOOR_AREA,
  FRAME_GLASS,
  Facade,
  GABLE_WALL,
  GLAZING,
  GROUND_AREA,
  INDOOR_SETPOINT,
  DESIGN_OUTDOOR,
  LONG_WALL,
  MASS,
  NEIGHBOUR,
  OVERHANG_GAP,
  OVERHEAT_LIMIT,
  ROOF_AREA,
  SIDE_FLOOR,
  DAYLIGHT_TARGET,
  VOLUME,
  WINDOW_HEIGHT,
  WINDOW_LEVELS,
  facadeAzimuth,
} from './design';
import { COLD_WEEK_START, HOT_WEEK_START, HOURS, getWeather, type Weather } from './weather';
import { behindObstacle, overhangShade } from './geometry';

const D2R = Math.PI / 180;
const AIR = 1200 / 3600; // W/K per m³/h
const GROUND_REFLECTANCE = 0.2;
const WEEK = 7 * 24;

export interface WeekTrace {
  outdoor: Float32Array;
  indoor: Float32Array;
  /** heating power, W */
  heating: Float32Array;
  /** sun through the windows, W */
  sun: Float32Array;
  /** 1 when the blinds are down on the sunniest facade */
  blinds: Uint8Array;
}

/** Heat in and out of the house over the year, kWh. In = out + stored. */
export interface Balance {
  heating: number;
  internal: number;
  sun: number;
  /** through the windows, including the gains that fall on the window panes (ISO 13790) */
  windows: number;
  /** through walls, roof and floor */
  opaque: number;
  /** with the ventilation air and air leaks, including summer airing */
  ventilation: number;
  /** heat left in the thermal mass at the end of the year */
  stored: number;
}

/** Conditions the year runs in; the defaults are the Västerås year and normal household gains. */
export interface SimEnv {
  weather?: Weather;
  internalGains?: (hour: number) => number;
}

export interface Result {
  /** bought heat, kWh per year */
  heating: number;
  heatingMonthly: number[];
  /** heat the house would need if no sun came through the windows */
  heatingNoSun: number;
  heatingNoSunMonthly: number[];
  /** sun through the windows, kWh per year */
  solar: number;
  solarMonthly: number[];
  solarByFacade: Record<Facade, number>;
  /** share of the sun through the windows that saved heating (slide 12) */
  usefulShare: number;
  /** hours with the room above 26 °C */
  overheatHours: number;
  overheatMonthly: number[];
  maxIndoor: number;
  /** heat load on the coldest day, W at −20 °C without sun (slide 22) */
  peakLoad: number;
  /** glass on each side of the house relative to what daylight needs (1 = enough) */
  daylight: { front: number; back: number };
  /** heat loss coefficient, W/K, split in parts */
  loss: { windows: number; opaque: number; ventilation: number };
  /** the year's energy balance from the hourly calculation */
  balance: Balance;
  hotWeek: WeekTrace;
  coldWeek: WeekTrace;
}

interface FacadeSun {
  /** W/m² of window, already through overhang, neighbour and angle losses */
  incident: Float32Array;
  /** W/m² falling on the facade before any shading, used by the blind control */
  onFacade: Float32Array;
}

/** Sun on each facade, hour by hour. */
function facadeSun(design: Design, w: Weather): Record<Facade, FacadeSun> {
  const out = {} as Record<Facade, FacadeSun>;
  const city = design.site === 'city';
  // height angle of the neighbour seen from each storey
  const obstacleSin = WINDOW_LEVELS.map((z) => Math.sin(Math.atan((NEIGHBOUR.height - z) / NEIGHBOUR.distance)));
  const overhang = design.shading === 'overhang' ? design.overhang : 0;
  const dv = OVERHANG_GAP + WINDOW_HEIGHT / 2;
  const overhangSky = overhang > 0 ? dv / Math.hypot(dv, overhang) : 1;

  for (const f of FACADES) {
    const psi = (facadeAzimuth(design, f) - 180) * D2R; // from south, + west
    const facingSouth = Math.max(0, Math.cos(psi));
    const neighbourSky = city ? 1 - facingSouth * (obstacleSin[0] + obstacleSin[1]) / 2 : 1;
    const incident = new Float32Array(HOURS);
    const onFacade = new Float32Array(HOURS);
    for (let t = 0; t < HOURS; t++) {
      const ghi = w.ghi[t];
      if (ghi <= 0) continue;
      const alt = w.sunAlt[t];
      const rel = w.sunAz[t] - psi;
      const cosTheta = Math.cos(alt) * Math.cos(rel);
      let beam = 0;
      if (cosTheta > 0 && alt > 0) {
        beam = w.dni[t] * cosTheta;
      }
      const sky = 0.5 * w.dhi[t];
      const ground = 0.5 * GROUND_REFLECTANCE * ghi;
      onFacade[t] = beam + sky + ground;

      let beamIn = 0;
      if (beam > 0) {
        // glass reflects more at grazing angles
        const iam = Math.max(0, 1 - 0.15 * (1 / cosTheta - 1));
        let lit = 1;
        if (overhang > 0) {
          const tanProfile = Math.tan(alt) / Math.cos(rel);
          lit = 1 - overhangShade(overhang, OVERHANG_GAP, WINDOW_HEIGHT, tanProfile);
        }
        if (city) {
          // the neighbour stands to the south; half the windows on each storey
          const tanAlt = Math.tan(alt);
          const c = Math.cos(w.sunAz[t]);
          let free = 0;
          for (const z of WINDOW_LEVELS) if (!behindObstacle(tanAlt, c, NEIGHBOUR.height - z, NEIGHBOUR.distance)) free += 0.5;
          lit *= free;
        }
        beamIn = beam * iam * lit;
      }
      incident[t] = beamIn + 0.85 * (sky * overhangSky * neighbourSky + ground);
    }
    out[f] = { incident, onFacade };
  }
  return out;
}

export function internalGains(hour: number) {
  // people, appliances and lighting: about 4 W/m² on average, more in the evening
  if (hour < 6) return 400;
  if (hour < 9) return 700;
  if (hour < 16) return 450;
  if (hour < 23) return 900;
  return 500;
}

export function lossCoefficients(design: Design) {
  const env = ENVELOPE[design.envelope];
  const glass = GLAZING[design.glazing];
  const win = design.windows;
  const windowArea = win.front + win.back + win.left + win.right;
  const wallArea = 2 * LONG_WALL + 2 * GABLE_WALL - windowArea;
  const opaque = (wallArea * env.uWall + ROOF_AREA * env.uRoof + 0.5 * GROUND_AREA * env.uGround) * (1 + env.bridges);
  const windows = windowArea * glass.u;
  const leak = AIR * env.leakage * VOLUME;
  const ventilation = AIR * env.airflow * (1 - env.recovery) + leak;
  return { opaque, windows, ventilation, leak, windowArea };
}

export function daylight(design: Design) {
  const glass = GLAZING[design.glazing];
  const city = design.site === 'city';
  const obstacleSin = WINDOW_LEVELS.map((z) => Math.sin(Math.atan((NEIGHBOUR.height - z) / NEIGHBOUR.distance)));
  const effective = (f: Facade) => {
    const psi = (facadeAzimuth(design, f) - 180) * D2R;
    const sky = city ? 1 - Math.max(0, Math.cos(psi)) * (obstacleSin[0] + obstacleSin[1]) / 2 : 1;
    return design.windows[f] * FRAME_GLASS * (glass.lt / 0.7) * sky;
  };
  const gables = 0.5 * (effective('left') + effective('right'));
  const need = DAYLIGHT_TARGET * SIDE_FLOOR;
  return {
    front: (effective('front') + gables) / need,
    back: (effective('back') + gables) / need,
  };
}

function emptyWeek(): WeekTrace {
  return {
    outdoor: new Float32Array(WEEK),
    indoor: new Float32Array(WEEK),
    heating: new Float32Array(WEEK),
    sun: new Float32Array(WEEK),
    blinds: new Uint8Array(WEEK),
  };
}

interface RunOut {
  heatingMonthly: number[];
  solarMonthly: number[];
  solarByFacade: Record<Facade, number>;
  overheatMonthly: number[];
  maxIndoor: number;
  hotWeek: WeekTrace;
  coldWeek: WeekTrace;
  balance: Balance;
}

function run(design: Design, sun: Record<Facade, FacadeSun> | null, w: Weather, gains: (hour: number) => number): RunOut {
  const env = ENVELOPE[design.envelope];
  const glass = GLAZING[design.glazing];
  const mass = MASS[design.mass];
  const loss = lossCoefficients(design);

  const af = FLOOR_AREA;
  const at = 4.5 * af;
  const am = mass.am * af;
  const cm = mass.cm * af;
  const hIs = 3.45 * at;
  const hMs = 9.1 * am;
  const hW = loss.windows;
  const hEm = 1 / (1 / loss.opaque - 1 / hMs);
  const hVentRecovered = loss.ventilation;
  const hVentBypass = AIR * env.airflow + loss.leak;
  const hNightAiring = AIR * 2.5 * VOLUME;
  const hOccupantAiring = AIR * 1.0 * VOLUME;

  const blindFactor = design.shading === 'outside' ? 0.15 : design.shading === 'inside' ? 0.7 : 1;
  const movable = design.shading === 'outside' || design.shading === 'inside';
  const gWin: Record<Facade, number> = {
    front: design.windows.front * FRAME_GLASS * glass.g,
    right: design.windows.right * FRAME_GLASS * glass.g,
    back: design.windows.back * FRAME_GLASS * glass.g,
    left: design.windows.left * FRAME_GLASS * glass.g,
  };

  const heatingMonthly = new Array(12).fill(0);
  const solarMonthly = new Array(12).fill(0);
  const overheatMonthly = new Array(12).fill(0);
  const solarByFacade: Record<Facade, number> = { front: 0, right: 0, back: 0, left: 0 };
  const hotWeek = emptyWeek();
  const coldWeek = emptyWeek();
  let maxIndoor = -99;
  const balance: Balance = { heating: 0, internal: 0, sun: 0, windows: 0, opaque: 0, ventilation: 0, stored: 0 };

  let thetaM = 21;
  let prevAir = 21;
  let prevOp = 21;
  // controls with a little hysteresis, so they do not flicker hour by hour
  let warm = false;
  let airing = false;

  // two weeks of late December first, so the mass starts at a realistic state
  const warmup = 14 * 24;
  for (let step = -warmup; step < HOURS; step++) {
    const t = step < 0 ? HOURS + step : step;
    const record = step >= 0;
    const te = w.temp[t];
    const hr = w.hour[t];

    // ventilation, with the summer measures of slide 20
    let hVe = hVentRecovered;
    const cooler = te < prevAir - 1;
    warm = prevOp > 23.5 || (warm && prevOp > 22.5);
    if (design.summerMode) {
      if (prevAir > 23 && te > 12 && cooler) hVe = hVentBypass;
      const night = hr >= 22 || hr < 7;
      airing = night && te > 8 && cooler && (prevAir > 23 || (airing && prevAir > 21.5));
      if (airing) hVe += hNightAiring;
    }
    // without a plan, people still open a window when the room is hot
    if (prevOp > 26 && te > 8 && cooler) hVe += hOccupantAiring;

    // sun through the windows; movable blinds come down when the room is warm
    let phiSol = 0;
    let blindsDown = 0;
    if (sun) {
      for (const f of FACADES) {
        if (gWin[f] === 0) continue;
        const s = sun[f];
        let gain = gWin[f] * s.incident[t];
        if (movable && warm && s.onFacade[t] > 150) {
          gain *= blindFactor;
          blindsDown = 1;
        }
        phiSol += gain;
        if (record) solarByFacade[f] += gain / 1000;
      }
    }

    const phiInt = gains(hr);
    const hTr1 = 1 / (1 / hVe + 1 / hIs);
    const hTr2 = hTr1 + hW;
    const hTr3 = 1 / (1 / hTr2 + 1 / hMs);
    const phiIa = 0.5 * phiInt;
    const share = 0.5 * phiInt + phiSol;
    const phiM = (am / at) * share;
    const phiSt = (1 - am / at - hW / (9.1 * at)) * share;
    const thetaSup = te;

    const step5r1c = (phiHC: number) => {
      const phiMtot = phiM + hEm * te + (hTr3 * (phiSt + hW * te + hTr1 * ((phiIa + phiHC) / hVe + thetaSup))) / hTr2;
      const c = cm / 3600;
      const mNew = (thetaM * (c - 0.5 * (hTr3 + hEm)) + phiMtot) / (c + 0.5 * (hTr3 + hEm));
      const mAvg = 0.5 * (mNew + thetaM);
      const s = (hMs * mAvg + phiSt + hW * te + hTr1 * (thetaSup + (phiIa + phiHC) / hVe)) / (hMs + hW + hTr1);
      const air = (hIs * s + hVe * thetaSup + phiIa + phiHC) / (hIs + hVe);
      return { mNew, mAvg, s, air };
    };

    let phiHC = 0;
    let state = step5r1c(0);
    if (state.air < INDOOR_SETPOINT) {
      const test = 10 * af;
      const s10 = step5r1c(test);
      phiHC = (test * (INDOOR_SETPOINT - state.air)) / (s10.air - state.air);
      state = step5r1c(phiHC);
    }
    const thetaMBefore = thetaM;
    thetaM = state.mNew;
    prevAir = state.air;
    const op = 0.3 * state.air + 0.7 * state.s;
    prevOp = op;

    if (!record) continue;
    // every watt-hour in and out, from the node temperatures of this hour
    balance.heating += phiHC;
    balance.internal += phiInt;
    balance.sun += phiSol;
    balance.windows += hW * (state.s - te) + (hW / (9.1 * at)) * share;
    balance.opaque += hEm * (state.mAvg - te);
    balance.ventilation += hVe * (state.air - thetaSup);
    balance.stored += (cm / 3600) * (state.mNew - thetaMBefore);

    const m = w.month[t];
    heatingMonthly[m] += phiHC / 1000;
    solarMonthly[m] += phiSol / 1000;
    if (op > OVERHEAT_LIMIT) overheatMonthly[m] += 1;
    if (op > maxIndoor) maxIndoor = op;

    for (const [start, trace] of [
      [HOT_WEEK_START, hotWeek],
      [COLD_WEEK_START, coldWeek],
    ] as const) {
      const k = t - start;
      if (k >= 0 && k < WEEK) {
        trace.outdoor[k] = te;
        trace.indoor[k] = op;
        trace.heating[k] = phiHC;
        trace.sun[k] = phiSol;
        trace.blinds[k] = blindsDown;
      }
    }
  }

  for (const k of Object.keys(balance) as (keyof Balance)[]) balance[k] /= 1000;
  return { heatingMonthly, solarMonthly, solarByFacade, overheatMonthly, maxIndoor, hotWeek, coldWeek, balance };
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function simulate(design: Design, env: SimEnv = {}): Result {
  const w = env.weather ?? getWeather();
  const gains = env.internalGains ?? internalGains;
  const sun = facadeSun(design, w);
  const withSun = run(design, sun, w, gains);
  const noSun = run(design, null, w, gains);
  const loss = lossCoefficients(design);

  const heating = sum(withSun.heatingMonthly);
  const heatingNoSun = sum(noSun.heatingMonthly);
  const solar = sum(withSun.solarMonthly);
  const peakLoad = (loss.opaque + loss.windows + loss.ventilation) * (INDOOR_SETPOINT - DESIGN_OUTDOOR);

  return {
    heating,
    heatingMonthly: withSun.heatingMonthly,
    heatingNoSun,
    heatingNoSunMonthly: noSun.heatingMonthly,
    solar,
    solarMonthly: withSun.solarMonthly,
    solarByFacade: withSun.solarByFacade,
    usefulShare: solar > 0 ? Math.max(0, (heatingNoSun - heating) / solar) : 0,
    overheatHours: sum(withSun.overheatMonthly),
    overheatMonthly: withSun.overheatMonthly,
    maxIndoor: withSun.maxIndoor,
    peakLoad,
    daylight: daylight(design),
    loss: { windows: loss.windows, opaque: loss.opaque, ventilation: loss.ventilation },
    balance: withSun.balance,
    hotWeek: withSun.hotWeek,
    coldWeek: withSun.coldWeek,
  };
}
