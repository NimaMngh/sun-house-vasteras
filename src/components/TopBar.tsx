import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FLOOR_AREA } from '../sim/design';
import type { Result } from '../sim/simulate';
import type { Score } from '../game/score';
import type { Metric } from '../game/missions';
import { num, pct } from '../game/format';
import { Bolt, Flame, HouseMark, Stars, SunIcon, Thermo } from './icons';
import { useAnimatedNumber } from './hooks';

type State = 'good' | 'warn' | 'bad' | 'info';

export function heatingState(r: Result): State {
  const q = r.heating / FLOOR_AREA;
  return q <= 20 ? 'good' : q <= 45 ? 'warn' : 'bad';
}
export function comfortState(r: Result): State {
  return r.overheatHours <= 100 ? 'good' : r.overheatHours <= 400 ? 'warn' : 'bad';
}
export function daylightState(r: Result): State {
  const worst = Math.min(r.daylight.front, r.daylight.back);
  return worst >= 1 ? 'good' : worst >= 0.8 ? 'warn' : 'bad';
}
export function peakState(r: Result): State {
  const p = r.peakLoad / FLOOR_AREA;
  return p <= 20 ? 'good' : p <= 32 ? 'warn' : 'bad';
}

const STATE_WORD: Record<State, string> = { good: 'good', warn: 'fair', bad: 'poor', info: '' };

function Tile(props: { icon: ReactNode; label: string; value: string; unit: string; state: State }) {
  return (
    <div className="metric" data-state={props.state} aria-label={`${props.label}: ${props.value} ${props.unit} ${STATE_WORD[props.state]}`}>
      <span className="metric-icon">{props.icon}</span>
      <span className="metric-label">{props.label}</span>
      <span className="metric-value num">
        {props.value}
        <span className="metric-unit">{props.unit}</span>
      </span>
    </div>
  );
}

function MetricTile({ metric, result }: { metric: Metric; result: Result }) {
  switch (metric) {
    case 'heating':
      return <Tile icon={<Flame />} label="Heating" value={num(result.heating)} unit="kWh" state={heatingState(result)} />;
    case 'comfort':
      return <Tile icon={<Thermo />} label="Above 26 °C" value={num(result.overheatHours)} unit="h" state={comfortState(result)} />;
    case 'daylight': {
      const worst = Math.min(result.daylight.front, result.daylight.back);
      return <Tile icon={<SunIcon />} label="Daylight" value={worst >= 1 ? 'OK' : pct(worst)} unit="" state={daylightState(result)} />;
    }
    case 'peak':
      return <Tile icon={<Bolt />} label="Peak −20 °C" value={num(result.peakLoad / 1000, 1)} unit="kW" state={peakState(result)} />;
    case 'useful':
      return <Tile icon={<SunIcon />} label="Useful sun" value={pct(result.usefulShare)} unit="" state="info" />;
  }
}

export function TopBar(props: { result: Result; score: Score; subtitle: string; metrics: Metric[] }) {
  const { result, score } = props;
  const shown = useAnimatedNumber(score.total);
  const [delta, setDelta] = useState<{ v: number; key: number } | null>(null);
  const last = useRef(score.total);

  useEffect(() => {
    const d = score.total - last.current;
    last.current = score.total;
    if (Math.abs(d) >= 1) setDelta({ v: d, key: Date.now() });
  }, [score.total]);

  return (
    <header className="topbar">
      <div className="topbar-inner wrap gutter">
        <div className="brand">
          <HouseMark className="brand-mark" />
          <div>
            <div className="brand-name">Sun House Västerås</div>
            <div className="brand-sub">{props.subtitle}</div>
          </div>
        </div>
        <div className="score" aria-live="polite">
          {score.max === 1000 && <Stars count={score.stars} />}
          <div>
            <span className="score-num num">{Math.round(shown)}</span>
            <span className="score-max num"> / {score.max}</span>
          </div>
          {delta && (
            <span key={delta.key} className={`score-delta ${delta.v > 0 ? 'up' : 'down'}`}>
              {delta.v > 0 ? '+' : '−'}
              {Math.abs(delta.v)}
            </span>
          )}
        </div>
        <div className="metrics">
          {props.metrics.map((m) => (
            <MetricTile key={m} metric={m} result={result} />
          ))}
        </div>
      </div>
    </header>
  );
}
