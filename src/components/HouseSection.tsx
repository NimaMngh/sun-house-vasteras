// A section through the house at noon, drawn like the sketches on slides 10 and 11:
// the sun at its real height for the chosen day, the beam through each window,
// what the overhang, blinds or neighbour take away, and where it lands.

import { useRef, type JSX, type PointerEvent as RPE } from 'react';
import { Design, NEIGHBOUR, OVERHANG_GAP, WINDOW_HEIGHT, facadeAzimuth } from '../sim/design';
import { noonAltitude } from '../sim/weather';
import { compass } from '../game/format';

export type DayId = 'dec' | 'oct' | 'mar' | 'jun';

export const DAYS: { id: DayId; label: string; n: number }[] = [
  { id: 'dec', label: '21 Dec', n: 355 },
  { id: 'oct', label: '20 Oct', n: 293 },
  { id: 'mar', label: '21 Mar', n: 80 },
  { id: 'jun', label: '21 Jun', n: 172 },
];

const W = 400;
const H = 250;
const S = 18; // px per metre
const GROUND = 214;
const CX = 200;
const DEPTH = 6 * S;
const XL = CX - DEPTH / 2;
const XR = CX + DEPTH / 2;
const STOREY = 2.7 * S;
const F0 = GROUND - 6; // ground floor surface
const F1 = F0 - STOREY; // upper floor surface
const F2 = F1 - STOREY; // ceiling under the roof
const WIN_H = WINDOW_HEIGHT * S;
const SILL = 0.8 * S;
const GAP = OVERHANG_GAP * S;
const D2R = Math.PI / 180;

const WALL_T = { old: 0.3, code: 0.42, passive: 0.55 };
const ROOF_T = { old: 0.2, code: 0.38, passive: 0.5 };
const PANES = { double: 2, triple: 3, solar: 3, quad: 4 };

interface Win {
  floor: number; // floor surface y
  top: number;
  bottom: number;
  level: number; // height of the window centre above ground, m
}

function windowsOn(area: number): Win[] {
  if (area <= 0) return [];
  const w = (floor: number): Win => ({
    floor,
    bottom: floor - SILL,
    top: floor - SILL - WIN_H,
    level: (GROUND - (floor - SILL - WIN_H / 2)) / S,
  });
  return area < 4 ? [w(F0)] : [w(F0), w(F1)];
}

export function HouseSection(props: {
  design: Design;
  day: DayId;
  canRotate: boolean;
  onRotate: (deg: number) => void;
}) {
  const { design, day } = props;
  const dayInfo = DAYS.find((d) => d.id === day)!;
  const alpha = noonAltitude(dayInfo.n);
  const tanAlpha = Math.tan(alpha * D2R);

  const front = facadeAzimuth(design, 'front');
  // angle between the front facade normal and the noon sun (due south)
  let delta = 180 - front;
  delta = ((delta + 540) % 360) - 180;
  const frontLit = Math.abs(delta) < 89.5;
  const backLit = Math.abs(delta) > 90.5;
  const litSide: -1 | 0 | 1 = frontLit ? -1 : backLit ? 1 : 0; // -1 = left (front), 1 = right (back)
  const dRel = frontLit ? delta : backLit ? 180 - Math.abs(delta) : 90;
  const cosRel = Math.cos(dRel * D2R);
  const profile = litSide === 0 ? 90 : Math.atan(tanAlpha / Math.max(cosRel, 1e-3)) / D2R;
  const tanP = Math.tan(profile * D2R);

  const wallT = WALL_T[design.envelope] * S;
  const roofT = ROOF_T[design.envelope] * S;
  const xLi = XL + wallT;
  const xRi = XR - wallT;
  const panes = PANES[design.glazing];
  const tinted = design.glazing === 'solar';
  const overhang = design.shading === 'overhang' ? design.overhang * S : 0;
  const blindsDown = (design.shading === 'outside' || design.shading === 'inside') && day === 'jun';
  const city = design.site === 'city' && litSide !== 0;

  const frontWins = windowsOn(design.windows.front);
  const backWins = windowsOn(design.windows.back);
  const litWins = litSide === -1 ? frontWins : litSide === 1 ? backWins : [];

  // equivalent height angle of the neighbour in the section plane (see simulate.ts)
  const neighbourTan = (level: number) => (NEIGHBOUR.height - level) / NEIGHBOUR.distance / Math.max(cosRel, 1e-3);

  // sun position: along the beam through the lower lit window, kept inside the frame
  const anchorY = litWins[0] ? (litWins[0].top + litWins[0].bottom) / 2 : F1;
  const anchorX = litSide === 1 ? XR : XL;
  const dirX = litSide === 1 ? 1 : -1;
  const cosP = Math.cos(profile * D2R);
  const sinP = Math.sin(profile * D2R);
  const reach = Math.min(
    cosP > 0.01 ? (litSide === 1 ? W - 26 - anchorX : anchorX - 26) / cosP : 999,
    (anchorY - 22) / Math.max(sinP, 0.01),
  );
  const sunX = litSide === 0 ? CX : anchorX + dirX * reach * cosP;
  const sunY = litSide === 0 ? 24 : anchorY - reach * sinP;

  const shafts: JSX.Element[] = [];
  const beams: JSX.Element[] = [];
  const patches: JSX.Element[] = [];
  const blinds: JSX.Element[] = [];

  litWins.forEach((w, i) => {
    const xo = litSide === 1 ? XR : XL;
    const xi = litSide === 1 ? xRi : xLi;
    const farWall = litSide === 1 ? xLi : xRi;
    const into = -dirX; // direction of travel into the room
    // top of the beam after the overhang
    let yTop = w.top;
    if (overhang > 0) yTop = Math.max(w.top, w.top - GAP + overhang * tanP);
    const blockedByNeighbour = city && tanP < neighbourTan(w.level);
    if (yTop >= w.bottom - 0.5) {
      return;
    }
    const outside = 420;
    const ox = outside * cosP * dirX;
    const oy = -outside * sinP;
    if (blockedByNeighbour) {
      return;
    }
    // light shaft outside
    shafts.push(
      <polygon
        key={`shaft${i}`}
        points={`${xo + ox},${yTop + oy} ${xo},${yTop} ${xo},${w.bottom} ${xo + ox},${w.bottom + oy}`}
        fill="var(--beam)"
      />,
    );
    if (blindsDown && design.shading === 'outside') {
      return;
    }
    // inside: from the glass to the floor or the far wall
    const hit = (y0: number) => {
      const dxFloor = (w.floor - y0) / Math.max(tanP, 1e-3);
      const xFloor = xi + into * dxFloor;
      const beyond = into > 0 ? xFloor > farWall : xFloor < farWall;
      if (!beyond) return { x: xFloor, y: w.floor, wall: false };
      const run = Math.abs(farWall - xi);
      return { x: farWall, y: y0 + run * tanP, wall: true };
    };
    if (blindsDown && design.shading === 'inside') {
      // the blind inside the glass catches the sun: the heat stays in the room
      patches.push(
        <rect key={`glow${i}`} x={Math.min(xi, xi + into * 10)} y={yTop} width={10} height={w.bottom - yTop} fill="var(--patch)" opacity={0.5} />,
      );
      return;
    }
    const a = hit(yTop);
    const b = hit(w.bottom);
    const pts = [`${xi},${yTop}`, `${xi},${w.bottom}`, `${b.x},${b.y}`];
    if (!b.wall && a.wall) pts.push(`${farWall},${w.floor}`);
    pts.push(`${a.x},${a.y}`);
    beams.push(<polygon key={`room${i}`} points={pts.join(' ')} fill="var(--beam)" />);
    // sunlit patch on the floor (and the far wall)
    const floorEnd = a.wall ? farWall : a.x;
    if (!b.wall) {
      patches.push(
        <rect key={`floor${i}`} x={Math.min(b.x, floorEnd)} y={w.floor - 2} width={Math.abs(floorEnd - b.x)} height={3.5} rx={1} fill="var(--patch)" />,
      );
    }
    if (a.wall) {
      const yWall = a.y;
      const yWallEnd = b.wall ? b.y : w.floor;
      patches.push(
        <rect key={`wall${i}`} x={into > 0 ? farWall - 3 : farWall} y={yWall} width={3} height={Math.max(0, yWallEnd - yWall)} fill="var(--patch)" />,
      );
    }
  });

  // blinds drawn on every window of the shaded facades
  const drawBlinds = (wins: Win[], side: -1 | 1) =>
    wins.forEach((w, i) => {
      const xo = side === 1 ? XR : XL;
      const xi = side === 1 ? xRi : xLi;
      if (design.shading === 'outside') {
        const x = xo + side * 4;
        if (blindsDown) {
          const slats = [];
          for (let y = w.top + 2; y < w.bottom; y += 4) slats.push(<line key={y} x1={x - 2.5} y1={y} x2={x + 2.5} y2={y + 2} />);
          blinds.push(
            <g key={`bo${side}${i}`} stroke="var(--ink-2)" strokeWidth={1.2}>
              <rect x={x - 3} y={w.top - 5} width={6} height={4} fill="var(--ink-2)" stroke="none" />
              {slats}
            </g>,
          );
        } else {
          blinds.push(<rect key={`bo${side}${i}`} x={x - 3} y={w.top - 5} width={6} height={5} fill="var(--ink-2)" />);
        }
      } else if (design.shading === 'inside') {
        const x = xi - side * 3;
        blinds.push(
          blindsDown ? (
            <rect key={`bi${side}${i}`} x={x - 1.5} y={w.top} width={3} height={w.bottom - w.top} fill="var(--ink-3)" />
          ) : (
            <rect key={`bi${side}${i}`} x={x - 2} y={w.top} width={4} height={3} fill="var(--ink-3)" />
          ),
        );
      }
    });
  drawBlinds(frontWins, -1);
  drawBlinds(backWins, 1);

  const floorFill = { light: 'var(--wood)', carpet: 'var(--concrete)', medium: 'var(--concrete)', heavy: 'var(--concrete)' }[design.mass];
  const topLayer = { light: 'var(--wood)', carpet: 'var(--carpet)', medium: 'var(--wood)', heavy: 'var(--concrete)' }[design.mass];
  const slabT = design.mass === 'light' ? 0.25 * S : 0.3 * S;

  const ground = { dec: '#eef3f5', oct: 'var(--ground)', mar: 'var(--ground)', jun: 'var(--ground)' }[day];
  const snow = day === 'dec';

  // compass inset, on the side away from the sun
  const insetX = litSide === -1 ? 352 : 48;
  const insetY = 48;
  const R = 31;
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const rotateTo = (e: RPE<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W - insetX;
    const y = ((e.clientY - rect.top) / rect.height) * H - insetY;
    if (Math.hypot(x, y) < 4) return;
    const az = (Math.atan2(x, -y) / D2R + 360) % 360;
    props.onRotate((Math.round(az / 15) * 15) % 360);
  };

  const planW = 34;
  const planH = 16;
  const win = design.windows;
  const seg = (area: number, max: number, len: number) => Math.max(area > 0 ? 3 : 0, (len - 4) * Math.min(1, area / max));

  // the neighbour, drawn so that its top sits at the right angle from the windows
  let neighbour: JSX.Element | null = null;
  let neighbourLabels: JSX.Element | null = null;
  const sunHidden = city && litWins.length > 0 && litWins.every((w) => tanP < neighbourTan(w.level));
  if (city) {
    const dist = 104;
    const xEdge = litSide === -1 ? XL - dist : XR + dist;
    const low = litWins[0]?.level ?? 1.4;
    const yLow = GROUND - low * S;
    const top = Math.max(8, yLow - dist * neighbourTan(low));
    const x = litSide === -1 ? xEdge - 40 : xEdge;
    neighbour = <rect x={x} y={top} width={40} height={GROUND - top} fill="var(--neighbour)" />;
    neighbourLabels = (
      <g>
        <text x={x + 20} y={GROUND - 8} textAnchor="middle" fontSize={9} fill="var(--ink)">
          12 m
        </text>
        {sunHidden && (
          <text
            x={(xEdge + (litSide === -1 ? XL : XR)) / 2}
            y={top - 18}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={600}
            fill="var(--ink)"
          >
            <tspan>The neighbour hides</tspan>
            <tspan x={(xEdge + (litSide === -1 ? XL : XR)) / 2} dy={12}>
              the noon sun
            </tspan>
          </text>
        )}
        <g stroke="var(--ink-3)" strokeWidth={1.2}>
          <line x1={(xEdge + (litSide === -1 ? XL : XR)) / 2 - 4} y1={GROUND - 4} x2={(xEdge + (litSide === -1 ? XL : XR)) / 2 - 1} y2={GROUND + 4} />
          <line x1={(xEdge + (litSide === -1 ? XL : XR)) / 2 + 1} y1={GROUND - 4} x2={(xEdge + (litSide === -1 ? XL : XR)) / 2 + 4} y2={GROUND + 4} />
        </g>
        <text x={(xEdge + (litSide === -1 ? XL : XR)) / 2} y={GROUND + 16} textAnchor="middle" fontSize={9} fill="var(--ink-2)">
          25 m
        </text>
      </g>
    );
  }

  const windowGlass = (w: Win, side: -1 | 1, key: string) => {
    const xo = side === 1 ? XR - wallT : XL;
    const lines = [];
    for (let k = 0; k < panes; k++) {
      const x = xo + ((k + 1) * wallT) / (panes + 1);
      lines.push(<line key={k} x1={x} y1={w.top} x2={x} y2={w.bottom} stroke="var(--wall-line)" strokeWidth={0.8} />);
    }
    return (
      <g key={key}>
        <rect x={xo} y={w.top} width={wallT} height={w.bottom - w.top} fill={tinted ? 'var(--cool)' : 'var(--glass)'} opacity={tinted ? 0.55 : 0.9} />
        {lines}
      </g>
    );
  };

  const overhangs = (wins: Win[], side: -1 | 1) =>
    overhang > 0
      ? wins.map((w, i) => {
          const xo = side === 1 ? XR : XL;
          const x = side === 1 ? xo : xo - overhang;
          return <rect key={`oh${side}${i}`} x={x} y={w.top - GAP - 2.5} width={overhang} height={2.5} fill="var(--wall-line)" />;
        })
      : null;

  return (
    <svg
      ref={svgRef}
      className="house-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Section of the house at noon on ${dayInfo.label}. The sun is ${alpha.toFixed(0)} degrees high. The front faces ${compass(front)}.`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky-top)" />
          <stop offset="1" stopColor="var(--sky-bottom)" />
        </linearGradient>
        <pattern id="insul" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="var(--insulation)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--wall-line)" strokeWidth="0.5" opacity="0.35" />
        </pattern>
      </defs>

      <rect x={0} y={0} width={W} height={GROUND} fill="url(#sky)" />
      {day === 'dec' && <rect x={0} y={0} width={W} height={GROUND} fill="var(--card)" opacity={0.18} />}

      {/* sun */}
      <g>
        <circle cx={sunX} cy={sunY} r={15} fill="#f5b82e" opacity={0.25} />
        <circle cx={sunX} cy={sunY} r={10} fill="#f5b82e" />
      </g>

      {neighbour}

      {/* ground */}
      <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="var(--soil)" />
      <rect x={0} y={GROUND} width={W} height={snow ? 5 : 3} fill={ground} />

      {neighbourLabels}

      {/* light outside */}
      {shafts}

      {/* house body */}
      <rect x={XL} y={F2} width={DEPTH} height={F0 - F2} fill="var(--wall)" />
      {/* roof */}
      <polygon points={`${XL - 10},${F2 - roofT} ${CX},${F2 - roofT - 40} ${XR + 10},${F2 - roofT}`} fill="var(--roof)" />
      <rect x={XL} y={F2 - roofT} width={DEPTH} height={roofT} fill="url(#insul)" />
      {/* walls */}
      <rect x={XL} y={F2 - roofT} width={wallT} height={GROUND - F2 + roofT} fill="url(#insul)" stroke="var(--wall-line)" strokeWidth={1} />
      <rect x={XR - wallT} y={F2 - roofT} width={wallT} height={GROUND - F2 + roofT} fill="url(#insul)" stroke="var(--wall-line)" strokeWidth={1} />
      {/* ground slab with insulation under it */}
      <rect x={XL} y={F0} width={DEPTH} height={GROUND - F0 + roofT * 0.4} fill={floorFill} />
      <rect x={XL} y={F0} width={DEPTH} height={2.5} fill={topLayer} />
      <rect x={XL} y={GROUND} width={DEPTH} height={roofT * 0.6} fill="url(#insul)" />
      {/* upper floor */}
      <rect x={xLi} y={F1} width={xRi - xLi} height={slabT} fill={floorFill} />
      <rect x={xLi} y={F1} width={xRi - xLi} height={2.5} fill={topLayer} />
      {design.mass === 'light' && (
        <g stroke="var(--wall-line)" strokeWidth={0.6} opacity={0.5}>
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <line key={f} x1={xLi + f * (xRi - xLi)} y1={F1 + 2.5} x2={xLi + f * (xRi - xLi)} y2={F1 + slabT} />
          ))}
        </g>
      )}
      {(design.mass === 'heavy' || design.mass === 'medium') && (
        <g fill="var(--concrete)">
          <rect x={CX - 3} y={F1 + slabT} width={6} height={F0 - F1 - slabT} />
          <rect x={CX - 3} y={F2} width={6} height={F1 - F2} />
        </g>
      )}

      {/* light inside */}
      {beams}

      {/* windows */}
      {frontWins.map((w, i) => windowGlass(w, -1, `f${i}`))}
      {backWins.map((w, i) => windowGlass(w, 1, `b${i}`))}
      {overhangs(frontWins, -1)}
      {overhangs(backWins, 1)}

      {patches}
      {blinds}

      {/* outline */}
      <rect x={XL} y={F2 - roofT} width={DEPTH} height={GROUND - F2 + roofT} fill="none" stroke="var(--wall-line)" strokeWidth={1.2} />

      {/* facade labels */}
      <text x={XL} y={GROUND + 16} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--accent-ink)">
        front · {compass(front)}
      </text>
      <text x={XR} y={GROUND + 16} textAnchor="middle" fontSize={10} fill="var(--ink-2)">
        back · {compass(facadeAzimuth(design, 'back'))}
      </text>
      {litSide === 0 && (
        <text x={CX} y={52} textAnchor="middle" fontSize={10} fill="var(--ink-2)">
          At noon the sun runs along these facades
        </text>
      )}

      {/* compass inset */}
      <g transform={`translate(${insetX} ${insetY})`}>
        <circle r={R + 6} fill="var(--card)" opacity={0.92} />
        <circle r={R} fill="none" stroke="var(--line-strong)" strokeWidth={1} />
        {[0, 90, 180, 270].map((a) => (
          <line
            key={a}
            x1={0}
            y1={-R}
            x2={0}
            y2={-R + 4}
            stroke="var(--ink-3)"
            strokeWidth={1}
            transform={`rotate(${a})`}
          />
        ))}
        <text y={-R + 13} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--ink)">
          N
        </text>
        <text y={R - 6} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--ink)">
          S
        </text>
        <text x={R - 8} y={3} textAnchor="middle" fontSize={8} fill="var(--ink-3)">
          E
        </text>
        <text x={-R + 8} y={3} textAnchor="middle" fontSize={8} fill="var(--ink-3)">
          W
        </text>
        <circle cy={R + 1} r={4} fill="#f5b82e" />
        {design.site === 'city' && <rect x={-18} y={R + 7} width={36} height={4} fill="var(--neighbour)" />}
        <g transform={`rotate(${front - 180})`}>
          <rect x={-planW / 2} y={-planH / 2} width={planW} height={planH} fill="var(--wall)" stroke="var(--wall-line)" strokeWidth={1.2} />
          {/* front (bottom edge), back (top), right facade = left edge, left facade = right edge */}
          <line x1={-planW / 2} y1={planH / 2} x2={planW / 2} y2={planH / 2} stroke="var(--accent)" strokeWidth={2.4} />
          <line x1={-seg(win.front, 30, planW) / 2} y1={planH / 2} x2={seg(win.front, 30, planW) / 2} y2={planH / 2} stroke="var(--glass)" strokeWidth={2.4} />
          <line x1={-seg(win.back, 30, planW) / 2} y1={-planH / 2} x2={seg(win.back, 30, planW) / 2} y2={-planH / 2} stroke="var(--glass)" strokeWidth={2.4} />
          <line x1={-planW / 2} y1={-seg(win.right, 12, planH) / 2} x2={-planW / 2} y2={seg(win.right, 12, planH) / 2} stroke="var(--glass)" strokeWidth={2.4} />
          <line x1={planW / 2} y1={-seg(win.left, 12, planH) / 2} x2={planW / 2} y2={seg(win.left, 12, planH) / 2} stroke="var(--glass)" strokeWidth={2.4} />
          <path d={`M0 ${planH / 2 + 3} l-3 5 h6 z`} fill="var(--accent)" />
        </g>
        {props.canRotate && (
          <circle
            r={R + 8}
            fill="transparent"
            className="compass-drag"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
              rotateTo(e);
            }}
            onPointerMove={(e) => dragging.current && rotateTo(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            <title>Drag to turn the house</title>
          </circle>
        )}
      </g>
    </svg>
  );
}
