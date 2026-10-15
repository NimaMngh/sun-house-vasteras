// Numbers as on the slides: a thin space between thousands, a decimal point.

const THIN = ' ';

export function num(x: number, decimals = 0) {
  const fixed = Math.abs(x).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
  const sign = x < 0 && Number(fixed) !== 0 ? '−' : '';
  return sign + grouped + (frac ? '.' + frac : '');
}

export function pct(x: number) {
  return `${Math.round(x * 100)}${THIN}%`;
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const NAMES: Record<string, string> = {
  N: 'north', NE: 'north-east', E: 'east', SE: 'south-east', S: 'south', SW: 'south-west', W: 'west', NW: 'north-west',
  NNE: 'north-north-east', ENE: 'east-north-east', ESE: 'east-south-east', SSE: 'south-south-east',
  SSW: 'south-south-west', WSW: 'west-south-west', WNW: 'west-north-west', NNW: 'north-north-west',
};

/** 16-point compass label for an azimuth in degrees. */
export function compass(az: number) {
  const a = ((az % 360) + 360) % 360;
  return POINTS[Math.round(a / 22.5) % 16];
}

export function compassName(az: number) {
  return NAMES[compass(az)];
}

/** Angle between a direction and south, 0 to 180 degrees. */
export function offSouth(az: number) {
  const a = ((az % 360) + 360) % 360;
  return Math.abs(180 - a);
}
