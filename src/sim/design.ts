// What the student can change, and the physics behind each choice.

export type Glazing = 'double' | 'triple' | 'solar' | 'quad';
export type Mass = 'light' | 'carpet' | 'medium' | 'heavy';
export type Shading = 'none' | 'overhang' | 'inside' | 'outside';
export type Envelope = 'old' | 'code' | 'passive';
export type Site = 'open' | 'city';
export type Facade = 'front' | 'right' | 'back' | 'left';

export const FACADES: Facade[] = ['front', 'right', 'back', 'left'];

export interface Design {
  /** compass direction the front facade faces, degrees clockwise from north (180 = south) */
  orientation: number;
  /** window area per facade, m² */
  windows: Record<Facade, number>;
  glazing: Glazing;
  mass: Mass;
  shading: Shading;
  /** depth of the fixed overhang, m */
  overhang: number;
  envelope: Envelope;
  site: Site;
}

/** Facade azimuth, degrees clockwise from north. right = front + 90°. */
export function facadeAzimuth(design: Design, f: Facade) {
  const offset = { front: 0, right: 90, back: 180, left: 270 }[f];
  return (((design.orientation + offset) % 360) + 360) % 360;
}

// ---- the house: two storeys, 12.5 m × 6 m, 150 m² heated floor ----

export const FLOOR_AREA = 150;
export const LONG_WALL = 12.5 * 5.4; // m², front and back
export const GABLE_WALL = 6 * 5.4; // m², right and left
export const ROOF_AREA = 75;
export const GROUND_AREA = 75;
export const VOLUME = FLOOR_AREA * 2.5;

export const WINDOW_MAX: Record<Facade, number> = { front: 30, right: 12, back: 30, left: 12 };

/** Glass share of a window (slide 12: about 0.7). */
export const FRAME_GLASS = 0.7;
/** Window height and gap above it for the overhang (slide 10). */
export const WINDOW_HEIGHT = 1.5;
export const OVERHANG_GAP = 0.25;

export interface GlazingSpec {
  u: number;
  g: number;
  /** light transmittance of the glass */
  lt: number;
}

export const GLAZING: Record<Glazing, GlazingSpec> = {
  double: { u: 1.4, g: 0.6, lt: 0.78 },
  triple: { u: 0.8, g: 0.5, lt: 0.7 },
  solar: { u: 0.8, g: 0.3, lt: 0.55 },
  quad: { u: 0.5, g: 0.4, lt: 0.62 },
};

export interface MassSpec {
  /** effective heat capacity per m² floor, J/(K·m²) (ISO 13790 classes) */
  cm: number;
  /** effective mass area per m² floor */
  am: number;
}

export const MASS: Record<Mass, MassSpec> = {
  light: { cm: 80_000, am: 2.5 },
  carpet: { cm: 110_000, am: 2.5 },
  medium: { cm: 165_000, am: 2.5 },
  heavy: { cm: 370_000, am: 3.5 },
};

export interface EnvelopeSpec {
  uWall: number;
  uRoof: number;
  uGround: number;
  /** extra for thermal bridges, share of the opaque losses */
  bridges: number;
  /** ventilation air flow, m³/h */
  airflow: number;
  /** heat recovery efficiency, 0 = none */
  recovery: number;
  /** air leakage, air changes per hour */
  leakage: number;
}

export const ENVELOPE: Record<Envelope, EnvelopeSpec> = {
  // The house of 6 October: about 20 000 kWh of heat a year
  old: { uWall: 0.35, uRoof: 0.2, uGround: 0.3, bridges: 0.2, airflow: 190, recovery: 0, leakage: 0.3 },
  code: { uWall: 0.18, uRoof: 0.11, uGround: 0.15, bridges: 0.1, airflow: 190, recovery: 0.75, leakage: 0.1 },
  passive: { uWall: 0.1, uRoof: 0.07, uGround: 0.08, bridges: 0.05, airflow: 190, recovery: 0.85, leakage: 0.04 },
};

/** The 12 m building 25 m to the south from task 1. */
export const NEIGHBOUR = { height: 12, distance: 25 };
/** window heights above the ground on the two storeys, m */
export const WINDOW_LEVELS = [1.4, 4.1];

export const INDOOR_SETPOINT = 21;
export const DESIGN_OUTDOOR = -20;
export const OVERHEAT_LIMIT = 26;

/** Daylight: glass area of at least 10 % of the floor area on each side of the house. */
export const DAYLIGHT_TARGET = 0.1;
export const SIDE_FLOOR = FLOOR_AREA / 2;

export const START_DESIGN: Design = {
  orientation: 0,
  windows: { front: 26, right: 3, back: 2, left: 3 },
  glazing: 'double',
  mass: 'light',
  shading: 'none',
  overhang: 0.8,
  envelope: 'code',
  site: 'open',
};
