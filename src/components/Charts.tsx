import { useLayoutEffect, useRef, useState, type PointerEvent as RPE, type ReactNode, type RefObject } from 'react';
import type { Result, WeekTrace } from '../sim/simulate';
import { MONTHS } from '../sim/weather';
import { num } from '../game/format';

type Tab = 'year' | 'hot' | 'cold';

function niceMax(v: number, minimum: number) {
  const x = Math.max(v, minimum);
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * pow >= x) return m * pow;
  return 10 * pow;
}

function compact(v: number) {
  if (v >= 1000) return `${num(v / 1000, v % 1000 === 0 ? 0 : 1)}k`;
  return num(v);
}

/** Bar with a 4 px rounded data end and a square base. */
function barPath(x: number, y: number, w: number, h: number, roundTop: boolean) {
  if (h <= 0) return '';
  const r = roundTop ? Math.min(4, h, w / 2) : 0;
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/** Width of the chart in px, so one unit in the drawing is one pixel on screen. */
function useWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(360);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 360);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return Math.max(280, Math.round(width));
}

interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

function useTip() {
  const wrap = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  /** svg units → px inside the wrapper */
  const place = (svg: SVGSVGElement, vbW: number, vbH: number, x: number, y: number) => {
    const r = svg.getBoundingClientRect();
    const w = wrap.current?.getBoundingClientRect();
    if (!w) return { x: 0, y: 0 };
    const px = r.left - w.left + (x / vbW) * r.width;
    const py = r.top - w.top + (y / vbH) * r.height;
    const half = 80;
    return { x: Math.min(Math.max(px, half), w.width - half), y: py };
  };
  return { wrap, tip, setTip, place };
}

function svgX(e: RPE<SVGSVGElement>, vbW: number) {
  const r = e.currentTarget.getBoundingClientRect();
  return ((e.clientX - r.left) / r.width) * vbW;
}

// ---------- the year ----------

function YearChart({ result, showComfort }: { result: Result; showComfort: boolean }) {
  const { wrap, tip, setTip, place } = useTip();
  const W = useWidth(wrap);
  const H = W > 520 ? 220 : 178;
  const m = { l: 34, r: 6, t: 18, b: 20 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const band = pw / 12;
  const bw = Math.min(20, band - 6);

  const bought = result.heatingMonthly;
  const fromSun = result.heatingNoSunMonthly.map((v, i) => Math.max(0, v - bought[i]));
  const total = bought.map((b, i) => b + fromSun[i]);
  const max = niceMax(Math.max(...total), 200);
  const y = (v: number) => m.t + ph - (v / max) * ph;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const hot = result.overheatMonthly;
  const H2 = W > 520 ? 92 : 78;
  const m2 = { t: 14, b: 20 };
  const ph2 = H2 - m2.t - m2.b;
  const hotMax = niceMax(Math.max(...hot), 40);
  const y2 = (v: number) => m2.t + ph2 - (v / hotMax) * ph2;
  const hotPeak = hot.indexOf(Math.max(...hot));

  const show = (svg: SVGSVGElement, i: number, vbH: number, yy: number) => {
    const p = place(svg, W, vbH, m.l + band * (i + 0.5), yy);
    setTip({
      ...p,
      content: (
        <>
          <b>{MONTHS[i]}</b>
          <div className="tt-row">
            <span className="tt-key" style={{ background: 'var(--heat)' }} />
            Heat you buy {num(bought[i])} kWh
          </div>
          <div className="tt-row">
            <span className="tt-key" style={{ background: 'var(--sun)' }} />
            Heat from the sun {num(fromSun[i])} kWh
          </div>
          {showComfort && (
            <div className="tt-row">
              <span className="tt-key" style={{ background: 'var(--accent)' }} />
              Above 26 °C {num(hot[i])} h
            </div>
          )}
        </>
      ),
    });
  };

  const onMove = (e: RPE<SVGSVGElement>, vbH: number, yy: (i: number) => number) => {
    const x = svgX(e, W) - m.l;
    const i = Math.floor(x / band);
    if (i < 0 || i > 11) return setTip(null);
    show(e.currentTarget, i, vbH, yy(i));
  };

  return (
    <div ref={wrap} style={{ position: 'relative' }} onPointerLeave={() => setTip(null)}>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--heat)' }} /> Heat you buy
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--sun)' }} /> Heat from the sun through the windows
        </span>
      </div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Heat per month: what you buy and what the sun gives"
        onPointerMove={(e) => onMove(e, H, (i) => y(total[i]))}
        onPointerDown={(e) => onMove(e, H, (i) => y(total[i]))}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'base-line' : 'grid-line'} x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
            <text className="axis-text num" x={m.l - 6} y={y(t) + 3} textAnchor="end">
              {compact(t)}
            </text>
          </g>
        ))}
        <text className="axis-text" x={m.l - 6} y={8} textAnchor="end">
          kWh
        </text>
        {MONTHS.map((name, i) => {
          const x = m.l + band * i + (band - bw) / 2;
          const hb = (bought[i] / max) * ph;
          const hs = (fromSun[i] / max) * ph;
          const gap = hb > 0 && hs > 0 ? 2 : 0;
          return (
            <g key={name}>
              <path d={barPath(x, y(bought[i]), bw, hb, hs <= 0.5)} fill="var(--heat)" />
              {hs > 0.5 && <path d={barPath(x, y(total[i]), bw, Math.max(0, hs - gap), true)} fill="var(--sun)" />}
              <text className="axis-text" x={x + bw / 2} y={H - 6} textAnchor="middle">
                {band > 34 ? name : name[0]}
              </text>
            </g>
          );
        })}
      </svg>

      {showComfort && <div className="chart-sub">Hours above 26 °C, per month</div>}
      {showComfort && <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H2}`}
        role="img"
        aria-label="Hours above 26 °C per month"
        onPointerMove={(e) => onMove(e, H2, (i) => y2(hot[i]))}
        onPointerDown={(e) => onMove(e, H2, (i) => y2(hot[i]))}
      >
        <line className="base-line" x1={m.l} x2={W - m.r} y1={y2(0)} y2={y2(0)} />
        <line className="grid-line" x1={m.l} x2={W - m.r} y1={y2(hotMax)} y2={y2(hotMax)} />
        <text className="axis-text num" x={m.l - 6} y={y2(hotMax) + 3} textAnchor="end">
          {compact(hotMax)} h
        </text>
        <text className="axis-text num" x={m.l - 6} y={y2(0) + 3} textAnchor="end">
          0
        </text>
        {MONTHS.map((name, i) => {
          const x = m.l + band * i + (band - bw) / 2;
          const h = (hot[i] / hotMax) * ph2;
          return (
            <g key={name}>
              <path d={barPath(x, y2(hot[i]), bw, h, true)} fill="var(--accent)" />
              {i === hotPeak && hot[i] > 0 && (
                <text className="axis-text num" x={x + bw / 2} y={y2(hot[i]) - 3} textAnchor="middle" style={{ fill: 'var(--ink-2)' }}>
                  {num(hot[i])}
                </text>
              )}
              <text className="axis-text" x={x + bw / 2} y={H2 - 6} textAnchor="middle">
                {band > 34 ? name : name[0]}
              </text>
            </g>
          );
        })}
      </svg>}
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}

// ---------- one week ----------

const WEEK_LABELS = {
  hot: ['10 Jul', '11 Jul', '12 Jul', '13 Jul', '14 Jul', '15 Jul', '16 Jul'],
  cold: ['20 Jan', '21 Jan', '22 Jan', '23 Jan', '24 Jan', '25 Jan', '26 Jan'],
};

function WeekChart({ trace, kind }: { trace: WeekTrace; kind: 'hot' | 'cold' }) {
  const { wrap, tip, setTip, place } = useTip();
  const W = useWidth(wrap);
  const H = W > 520 ? 240 : 196;
  const m = { l: 34, r: 8, t: 18, b: 22 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const n = trace.indoor.length;
  const x = (i: number) => m.l + (i / (n - 1)) * pw;

  let lo: number;
  let hi: number;
  let series: { key: string; label: string; color: string; values: Float32Array; unit: string; scale: number }[];
  if (kind === 'hot') {
    lo = Math.floor(Math.min(...trace.outdoor) / 5) * 5;
    hi = Math.max(35, Math.ceil(Math.max(...trace.indoor) / 5) * 5);
    series = [
      { key: 'in', label: 'Room', color: 'var(--heat)', values: trace.indoor, unit: '°C', scale: 1 },
      { key: 'out', label: 'Outdoors', color: 'var(--cool)', values: trace.outdoor, unit: '°C', scale: 1 },
    ];
  } else {
    lo = 0;
    const peak = Math.max(...trace.heating, ...trace.sun) / 1000;
    hi = niceMax(peak, 1);
    series = [
      { key: 'heat', label: 'Heating power', color: 'var(--heat)', values: trace.heating, unit: 'kW', scale: 1000 },
      { key: 'sun', label: 'Sun through the windows', color: 'var(--sun)', values: trace.sun, unit: 'kW', scale: 1000 },
    ];
  }
  const y = (v: number) => m.t + ph - ((v - lo) / (hi - lo)) * ph;
  const step = kind === 'hot' ? 5 : hi / 4;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t);

  const path = (vals: Float32Array, scale: number) =>
    Array.from(vals)
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v / scale).toFixed(1)}`)
      .join(' ');
  const area = (vals: Float32Array, scale: number) => `${path(vals, scale)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  // blinds-down spells as bands
  const bands: [number, number][] = [];
  if (kind === 'hot') {
    let start = -1;
    for (let i = 0; i <= n; i++) {
      const on = i < n && trace.blinds[i] === 1;
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        bands.push([start, i]);
        start = -1;
      }
    }
  }
  const [hover, setHover] = useState<number | null>(null);

  const onMove = (e: RPE<SVGSVGElement>) => {
    const sx = svgX(e, W);
    const i = Math.round(((sx - m.l) / pw) * (n - 1));
    if (i < 0 || i >= n) {
      setHover(null);
      return setTip(null);
    }
    setHover(i);
    const top = Math.min(...series.map((s) => y(s.values[i] / s.scale)));
    const p = place(e.currentTarget, W, H, x(i), top);
    const day = Math.floor(i / 24);
    const hour = i % 24;
    setTip({
      ...p,
      content: (
        <>
          <b>
            {WEEK_LABELS[kind][day]}, {String(hour).padStart(2, '0')}:00
          </b>
          {series.map((s) => (
            <div className="tt-row" key={s.key}>
              <span className="tt-key" style={{ background: s.color }} />
              {s.label} {num(s.values[i] / s.scale, 1)} {s.unit}
            </div>
          ))}
          {kind === 'hot' && trace.blinds[i] === 1 && <div>Blinds down</div>}
          {kind === 'cold' && <div>Outdoors {num(trace.outdoor[i], 1)} °C</div>}
        </>
      ),
    });
  };

  const above = kind === 'hot' ? Array.from(trace.indoor).filter((v) => v > 26).length : 0;
  const coldMin = Math.min(...trace.outdoor);

  return (
    <div
      ref={wrap}
      style={{ position: 'relative' }}
      onPointerLeave={() => {
        setTip(null);
        setHover(null);
      }}
    >
      <div className="legend">
        {series.map((s) => (
          <span className="legend-item" key={s.key}>
            <span className="legend-line" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        {kind === 'hot' && bands.length > 0 && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--line-strong)' }} /> Blinds down
          </span>
        )}
      </div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={kind === 'hot' ? 'Room and outdoor temperature in a July heat wave' : 'Heating power and sun in a January cold snap'}
        onPointerMove={onMove}
        onPointerDown={onMove}
      >
        {bands.map(([a, b]) => (
          <rect key={a} x={x(a)} y={m.t} width={Math.max(1, x(b) - x(a))} height={ph} fill="var(--line-strong)" opacity={0.45} />
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === lo ? 'base-line' : 'grid-line'} x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
            <text className="axis-text num" x={m.l - 6} y={y(t) + 3} textAnchor="end">
              {num(t, kind === 'cold' && hi < 4 ? 1 : 0)}
            </text>
          </g>
        ))}
        <text className="axis-text" x={m.l - 6} y={8} textAnchor="end">
          {kind === 'hot' ? '°C' : 'kW'}
        </text>
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <g key={d}>
            {d > 0 && <line className="grid-line" x1={x(d * 24)} x2={x(d * 24)} y1={m.t} y2={m.t + ph} />}
            <text className="axis-text" x={x(d * 24 + 12)} y={H - 6} textAnchor="middle">
              {WEEK_LABELS[kind][d]}
            </text>
          </g>
        ))}
        {kind === 'hot' && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={y(26)} y2={y(26)} stroke="var(--ink-2)" strokeWidth={1} />
            <text x={m.l + 4} y={y(26) - 4} textAnchor="start" className="axis-text" style={{ fill: 'var(--ink-2)', paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3 }}>
              26 °C limit
            </text>
          </g>
        )}
        {kind === 'cold' &&
          series.map((s) => <path key={`a${s.key}`} d={area(s.values, s.scale)} fill={s.color} opacity={0.1} />)}
        {series.map((s) => (
          <path key={s.key} d={path(s.values, s.scale)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ph} stroke="var(--ink-3)" strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] / s.scale)} r={4} fill={s.color} stroke="var(--card)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      <p className="chart-note">
        {kind === 'hot'
          ? above > 0
            ? `${above} of the 168 hours of this week are above 26 °C in the room.`
            : 'The room stays at or below 26 °C all week.'
          : `Outdoors down to ${num(coldMin, 0)} °C. On the clear days the noon sun takes over part of the heating.`}
      </p>
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}

export type ChartDetail = 'year' | 'season' | 'all';

const TABS: Record<ChartDetail, [Tab, string][]> = {
  year: [],
  season: [
    ['year', 'Year'],
    ['hot', 'July heat'],
  ],
  all: [
    ['year', 'Year'],
    ['hot', 'July heat'],
    ['cold', 'January cold'],
  ],
};

export function Charts({ result, level }: { result: Result; level: ChartDetail }) {
  const [chosen, setTab] = useState<Tab>('year');
  const tabs = TABS[level];
  const tab = tabs.some(([id]) => id === chosen) ? chosen : 'year';
  return (
    <section className="card" aria-label="Charts">
      <div className="chart-tabs card-head" style={{ marginBottom: 0 }}>
        <h2 className="card-title">{level === 'year' ? 'Heat through the year' : 'Your year, hour by hour'}</h2>
        {tabs.length > 0 && (
          <div className="seg" role="group" aria-label="Chart">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="chart-body">
        {tab === 'year' && <YearChart result={result} showComfort={level !== 'year'} />}
        {tab === 'hot' && <WeekChart trace={result.hotWeek} kind="hot" />}
        {tab === 'cold' && <WeekChart trace={result.coldWeek} kind="cold" />}
      </div>
    </section>
  );
}
