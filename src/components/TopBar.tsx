import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FLOOR_AREA } from '../sim/design';
import type { Result } from '../sim/simulate';
import type { Score } from '../game/score';
import { num, pct } from '../game/format';
import { Bolt, Check, Flame, HouseMark, Stars, SunIcon, Thermo } from './icons';
import { useAnimatedNumber } from './hooks';

type State = 'good' | 'warn' | 'bad';

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

const STATE_WORD: Record<State, string> = { good: 'good', warn: 'fair', bad: 'poor' };

function Metric(props: { icon: ReactNode; label: string; value: string; unit: string; state: State }) {
  return (
    <div className="metric" data-state={props.state} aria-label={`${props.label}: ${props.value} ${props.unit}, ${STATE_WORD[props.state]}`}>
      <span className="metric-icon">{props.icon}</span>
      <span className="metric-label">{props.label}</span>
      <span className="metric-value num">
        {props.value}
        <span className="metric-unit">{props.unit}</span>
      </span>
    </div>
  );
}

export interface GoalChip {
  short: string;
  ok: boolean;
}

export function TopBar({ result, score, subtitle, goals }: { result: Result; score: Score; subtitle: string; goals?: GoalChip[] }) {
  const shown = useAnimatedNumber(score.total);
  const [delta, setDelta] = useState<{ v: number; key: number } | null>(null);
  const last = useRef(score.total);

  useEffect(() => {
    const d = score.total - last.current;
    last.current = score.total;
    if (Math.abs(d) >= 1) setDelta({ v: d, key: Date.now() });
  }, [score.total]);

  const worstDay = Math.min(result.daylight.front, result.daylight.back);

  return (
    <header className="topbar">
      <div className="topbar-inner wrap gutter">
        <div className="brand">
          <HouseMark className="brand-mark" />
          <div>
            <div className="brand-name">Sun House Västerås</div>
            <div className="brand-sub">{subtitle}</div>
          </div>
        </div>
        <div className="score" aria-live="polite">
          <Stars count={score.stars} />
          <div>
            <span className="score-num num">{Math.round(shown)}</span>
            <span className="score-max"> / 1000</span>
          </div>
          {delta && (
            <span key={delta.key} className={`score-delta ${delta.v > 0 ? 'up' : 'down'}`}>
              {delta.v > 0 ? '+' : '−'}
              {Math.abs(delta.v)}
            </span>
          )}
        </div>
        <div className="metrics">
          <Metric icon={<Flame />} label="Heating" value={num(result.heating)} unit="kWh" state={heatingState(result)} />
          <Metric icon={<Thermo />} label="Above 26 °C" value={num(result.overheatHours)} unit="h" state={comfortState(result)} />
          <Metric
            icon={<SunIcon />}
            label="Daylight"
            value={worstDay >= 1 ? 'OK' : pct(worstDay)}
            unit=""
            state={daylightState(result)}
          />
          <Metric icon={<Bolt />} label="Peak −20 °C" value={num(result.peakLoad / 1000, 1)} unit="kW" state={peakState(result)} />
        </div>
        {goals && goals.length > 0 && (
          <div className="goal-strip" aria-label="Mission goals">
            {goals.map((g) => (
              <span key={g.short} className="goal-chip" data-ok={g.ok}>
                <span className="goal-chip-mark" aria-hidden>
                  {g.ok && <Check size={10} />}
                </span>
                {g.short}
                <span className="sr-only">{g.ok ? ' done' : ' not yet'}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
