// A typical year of hourly weather for Västerås (59.6° N).
//
// No weather file is shipped: the year is generated from a fixed seed and
// calibrated so that its monthly sun matches the lecture data (backup slide 2,
// Stockholm global radiation from Hastings and Wall 2007, Fig. 8.1.2) and its
// monthly temperatures match the Västerås climate normals. Every student gets
// exactly the same year.

export const LATITUDE = 59.6;
export const HOURS = 8760;

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Global radiation on a flat roof, kWh/m² per month (backup slide 2). */
export const GHI_MONTH = [10, 27, 68, 109, 164, 177, 161, 129, 77, 38, 14, 7];

/** Monthly mean outdoor temperature in Västerås, °C (about SMHI 1991–2020). */
export const T_MONTH = [-2.3, -2.4, 0.9, 5.6, 10.7, 15.0, 17.8, 16.6, 12.0, 6.6, 2.4, -0.9];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** First hour of the cold snap and of the heat wave shown in the week charts. */
export const COLD_WEEK_START = 19 * 24;
export const HOT_WEEK_START = 190 * 24;

export interface Weather {
  month: Uint8Array;
  day: Uint16Array;
  hour: Uint8Array;
  /** outdoor air, °C */
  temp: Float32Array;
  /** global horizontal, W/m² (mean over the hour) */
  ghi: Float32Array;
  /** diffuse horizontal, W/m² */
  dhi: Float32Array;
  /** beam normal, W/m² */
  dni: Float32Array;
  /** sun height above the horizon, radians (negative at night) */
  sunAlt: Float32Array;
  /** sun azimuth measured from south, positive towards west, radians */
  sunAz: Float32Array;
}

const D2R = Math.PI / 180;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Declination in degrees (Cooper), the formula behind the slide 6 table. */
export function declination(dayOfYear: number) {
  return 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
}

/** Sun height at solar noon in degrees: 90 − φ + δ (slide 6). */
export function noonAltitude(dayOfYear: number) {
  return 90 - LATITUDE + declination(dayOfYear);
}

function erf(x: number) {
  // Abramowitz and Stegun 7.1.26
  const s = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return s * y;
}

/** Erbs correlation: diffuse share of the hourly global radiation. */
function diffuseFraction(kt: number) {
  if (kt <= 0.22) return 1 - 0.09 * kt;
  if (kt <= 0.8) return 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4;
  return 0.165;
}

let cached: Weather | null = null;

export function getWeather(): Weather {
  if (!cached) cached = generate();
  return cached;
}

function generate(): Weather {
  const rand = mulberry32(20261020);
  const phi = LATITUDE * D2R;

  const month = new Uint8Array(HOURS);
  const day = new Uint16Array(HOURS);
  const hour = new Uint8Array(HOURS);
  const sunAlt = new Float32Array(HOURS);
  const sunAz = new Float32Array(HOURS);
  const i0 = new Float32Array(HOURS);
  const clear = new Float32Array(HOURS);

  // Sun geometry at the middle of every hour, in solar time.
  let h = 0;
  let d = -1;
  for (let m = 0; m < 12; m++) {
    for (let dm = 0; dm < MONTH_DAYS[m]; dm++) {
      d++;
      const n = d + 1;
      const delta = declination(n) * D2R;
      const e0 = 1361 * (1 + 0.033 * Math.cos((2 * Math.PI * n) / 365));
      for (let hr = 0; hr < 24; hr++, h++) {
        month[h] = m;
        day[h] = d;
        hour[h] = hr;
        const omega = (15 * (hr + 0.5 - 12)) * D2R;
        const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
        const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
        const cosZ = sinAlt;
        const sinZ = Math.cos(alt);
        let az = 0;
        if (sinZ > 1e-6) {
          const c = (cosZ * Math.sin(phi) - Math.sin(delta)) / (sinZ * Math.cos(phi));
          az = Math.acos(Math.max(-1, Math.min(1, c))) * Math.sign(omega || 1e-9);
        }
        sunAlt[h] = alt;
        sunAz[h] = az;
        if (sinAlt > 0.01) {
          i0[h] = e0 * sinAlt;
          // Haurwitz clear sky, used only for the shape of the day
          clear[h] = 1098 * sinAlt * Math.exp(-0.057 / sinAlt);
        }
      }
    }
  }

  // Daily clearness: monthly mean plus a persistent random part, so that sunny
  // and grey days come in spells as they do in reality.
  const days = 365;
  const dayMonth = new Uint8Array(days);
  for (let d = 0, k = 0; k < 12; k++) for (let j = 0; j < MONTH_DAYS[k]; j++) dayMonth[d++] = k;

  const h0Month = new Array(12).fill(0);
  for (let t = 0; t < HOURS; t++) h0Month[month[t]] += i0[t];
  const ktMonth = GHI_MONTH.map((g, m) => (g * 1000) / h0Month[m]);

  // Swedish days are mostly either grey or clear: a clear day comes with
  // probability p, set so that the month keeps its mean clearness.
  const KT_CLEAR = 0.64;
  const KT_GREY = 0.16;
  const ktDay = new Float32Array(days);
  let z = 0;
  for (let d = 0; d < days; d++) {
    z = 0.55 * z + Math.sqrt(1 - 0.55 ** 2) * gaussian(rand);
    const m = dayMonth[d];
    const p = Math.min(0.95, Math.max(0.05, (ktMonth[m] - KT_GREY) / (KT_CLEAR - KT_GREY)));
    // z is standard normal; the day is clear when z is above the p-quantile
    const u = 0.5 * (1 + erf(z / Math.SQRT2));
    const base = u > 1 - p ? KT_CLEAR : KT_GREY;
    ktDay[d] = Math.min(0.74, Math.max(0.05, base + 0.07 * gaussian(rand)));
  }
  // A clear cold snap in late January and a sunny heat wave in July
  for (let d = 19; d < 26; d++) ktDay[d] = 0.55;
  for (let d = 190; d < 197; d++) ktDay[d] = 0.68;

  const ghi = new Float32Array(HOURS);
  for (let d = 0; d < days; d++) {
    const t0 = d * 24;
    let h0Day = 0;
    let shapeSum = 0;
    const shape = new Float32Array(24);
    const cloudy = 1 - Math.min(1, ktDay[d] / 0.65);
    for (let hr = 0; hr < 24; hr++) {
      const t = t0 + hr;
      h0Day += i0[t];
      if (clear[t] > 0) {
        shape[hr] = clear[t] * Math.max(0.2, 1 + 0.35 * cloudy * gaussian(rand));
        shapeSum += shape[hr];
      }
    }
    if (shapeSum <= 0) continue;
    const total = ktDay[d] * h0Day;
    for (let hr = 0; hr < 24; hr++) ghi[t0 + hr] = (total * shape[hr]) / shapeSum;
  }

  // Calibrate each month to the slide data; cap at a physical clear sky.
  for (let iter = 0; iter < 6; iter++) {
    const sum = new Array(12).fill(0);
    for (let t = 0; t < HOURS; t++) sum[month[t]] += ghi[t];
    for (let t = 0; t < HOURS; t++) {
      const f = (GHI_MONTH[month[t]] * 1000) / sum[month[t]];
      ghi[t] = Math.min(ghi[t] * f, 0.8 * i0[t], 1.08 * clear[t]);
    }
  }

  const dhi = new Float32Array(HOURS);
  const dni = new Float32Array(HOURS);
  for (let t = 0; t < HOURS; t++) {
    if (ghi[t] <= 0) continue;
    const sinAlt = Math.sin(sunAlt[t]);
    if (sunAlt[t] < 3 * D2R) {
      dhi[t] = ghi[t];
      continue;
    }
    const kt = ghi[t] / i0[t];
    dhi[t] = ghi[t] * diffuseFraction(kt);
    dni[t] = Math.min(950, (ghi[t] - dhi[t]) / sinAlt);
    dhi[t] = ghi[t] - dni[t] * sinAlt;
  }

  // Temperature: smooth seasonal normal, a persistent daily anomaly linked to
  // the clouds, and a daily swing that grows with sun and day length.
  const midDay: number[] = [];
  for (let m = 0, start = 0; m < 12; start += MONTH_DAYS[m], m++) midDay.push(start + MONTH_DAYS[m] / 2);
  const normal = new Float32Array(days);
  for (let d = 0; d < days; d++) {
    let k = midDay.findIndex((x) => x > d + 0.5);
    if (k === -1) k = 12;
    const m0 = (k + 11) % 12;
    const m1 = k % 12;
    const x0 = k === 0 ? midDay[11] - 365 : midDay[k - 1];
    const x1 = k === 12 ? midDay[0] + 365 : midDay[k];
    const w = (d + 0.5 - x0) / (x1 - x0);
    normal[d] = T_MONTH[m0] * (1 - w) + T_MONTH[m1] * w;
  }

  const tDay = new Float32Array(days);
  let a = 0;
  for (let d = 0; d < days; d++) {
    const m = dayMonth[d];
    const winter = m <= 1 || m >= 10;
    const summer = m >= 4 && m <= 7;
    const sigma = winter ? 4.2 : summer ? 2.3 : 3.0;
    a = 0.78 * a + Math.sqrt(1 - 0.78 ** 2) * sigma * gaussian(rand);
    const sunny = (ktDay[d] - ktMonth[m]) / 0.2;
    const link = winter ? -1.6 : summer ? 1.6 : 0;
    tDay[d] = normal[d] + a + link * sunny;
  }
  for (let d = 19; d < 26; d++) tDay[d] = -14 - 2.5 * Math.sin((Math.PI * (d - 18.5)) / 7);
  for (let d = 190; d < 197; d++) tDay[d] = 22.5 + 2.5 * Math.sin((Math.PI * (d - 189.5)) / 7);

  // Re-centre the other days of each month on the normal.
  for (let m = 0, start = 0; m < 12; start += MONTH_DAYS[m], m++) {
    let err = 0;
    let free = 0;
    for (let d = start; d < start + MONTH_DAYS[m]; d++) err += tDay[d] - T_MONTH[m];
    const fixed = (d: number) => (d >= 19 && d < 26) || (d >= 190 && d < 197);
    for (let d = start; d < start + MONTH_DAYS[m]; d++) if (!fixed(d)) free++;
    for (let d = start; d < start + MONTH_DAYS[m]; d++) if (!fixed(d)) tDay[d] -= err / free;
  }

  const temp = new Float32Array(HOURS);
  for (let t = 0; t < HOURS; t++) {
    const d = day[t];
    const hr = hour[t];
    // linear between the daily means, centred at noon, so days join smoothly
    const pos = d + (hr + 0.5 - 12) / 24;
    const d0 = Math.floor(pos);
    const w = pos - d0;
    const ta = tDay[(d0 + days) % days];
    const tb = tDay[(d0 + 1) % days];
    const mean = ta * (1 - w) + tb * w;
    const season = 0.5 - 0.5 * Math.cos((2 * Math.PI * (d - 10)) / 365);
    const swing = (1.0 + 2.8 * season) * (0.45 + 0.9 * Math.min(1, ktDay[d] / 0.6));
    temp[t] = mean + swing * Math.cos((2 * Math.PI * (hr + 0.5 - 15)) / 24);
  }

  return { month, day, hour, temp, ghi, dhi, dni, sunAlt, sunAz };
}
