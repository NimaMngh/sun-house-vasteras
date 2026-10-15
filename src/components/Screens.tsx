import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Design, START_DESIGN, facadeAzimuth } from '../sim/design';
import type { Result } from '../sim/simulate';
import type { Score } from '../game/score';
import { MAIN_MISSIONS, MISSIONS, type Guess, type Mission, type Snapshot } from '../game/missions';
import { num, offSouth, pct } from '../game/format';
import { Arrow, Check, HouseMark, Reset, Stars } from './icons';
import { HouseSection } from './HouseSection';

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: Math.random() * 100,
        dx: `${(Math.random() - 0.5) * 160}px`,
        rot: `${(Math.random() - 0.5) * 900}deg`,
        dur: `${1.4 + Math.random() * 1.2}s`,
        delay: `${Math.random() * 0.25}s`,
        color: ['#e2571f', '#f5b82e', '#2f7fb5', '#1b8546', '#d4483f'][i % 5],
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              ['--dx' as string]: p.dx,
              ['--rot' as string]: p.rot,
              ['--dur' as string]: p.dur,
              ['--delay' as string]: p.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function CompleteModal(props: {
  mission: Mission;
  index: number;
  before: Snapshot;
  after: Snapshot;
  guess: Guess | null;
  next: Mission | null;
  onNext: () => void;
  onStay: () => void;
}) {
  const { mission, before, after } = props;
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    try {
      navigator.vibrate?.(60);
    } catch {
      // not supported
    }
  }, []);
  const label = props.next
    ? `${props.next.bonus ? 'Bonus' : `Mission ${props.index + 2}`}: ${props.next.title}`
    : 'See my house';
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <Confetti />
      <div className="modal">
        <div className="modal-badge" aria-hidden>
          <Check size={30} />
        </div>
        <div className="eyebrow">{mission.bonus ? 'Bonus mission' : `Mission ${props.index + 1}`} complete</div>
        <h2 id="done-title">{mission.title}</h2>
        <div className="modal-score">
          Score <b className="num">{num(before.score)}</b> <Arrow size={14} /> <b className="num">{num(after.score)}</b>
        </div>
        {mission.guess && props.guess && (
          <p className="hint" style={{ marginTop: 12 }}>
            {props.guess === mission.guess.answer
              ? 'Your guess was right: the useful share went down.'
              : `You guessed “${mission.guess.options.find((o) => o.id === props.guess)?.label.toLowerCase()}”. In fact the useful share went down.`}
          </p>
        )}
        <div className="modal-insight">
          <h3>{mission.insight.title}</h3>
          <p>{mission.insight.text(before, after)}</p>
          <div className="modal-source">{mission.insight.source}</div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={props.onStay}>
            Stay here
          </button>
          <button ref={button} type="button" className="btn btn-primary" onClick={props.onNext}>
            {label} <Arrow size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Intro(props: { onStart: () => void; onFree: () => void; resume: boolean; onResume: () => void }) {
  const demo: Design = { ...START_DESIGN, orientation: 180, windows: { front: 12, right: 3, back: 8, left: 3 }, shading: 'overhang', overhang: 1.1, mass: 'heavy', glazing: 'triple' };
  return (
    <main className="intro gutter">
      <div className="intro-card">
        <div className="intro-art">
          <HouseSection design={demo} day="oct" canRotate={false} onRotate={() => {}} />
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="eyebrow">BTA224 · Solar heating in buildings · 20 October</div>
          <h1>
            Sun House <span>Västerås</span>
          </h1>
          <p className="intro-lead">
            You are the architect of a 150 m² house at 59.6° N. Use the low winter sun, keep the summer sun out, and keep the
            rooms bright. Each change sends your house through a whole year of Västerås weather, hour by hour.
          </p>
        </div>
        <div className="intro-facts">
          <div className="intro-fact">
            <b>6 missions</b>
            <span>built on the six rules, plus a bonus</span>
          </div>
          <div className="intro-fact">
            <b className="num">8 760 h</b>
            <span>simulated every time you change something</span>
          </div>
          <div className="intro-fact">
            <b className="num">1 000</b>
            <span>points for the perfect house</span>
          </div>
        </div>
        <div className="intro-actions">
          {props.resume ? (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={props.onResume}>
                Continue <Arrow size={18} />
              </button>
              <button type="button" className="btn" onClick={props.onStart}>
                <Reset /> Start over
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={props.onStart}>
              Start mission 1 <Arrow size={18} />
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={props.onFree}>
            Free design, all controls open
          </button>
        </div>
      </div>
    </main>
  );
}

interface RuleCheck {
  name: string;
  ok: boolean;
  why: string;
}

function ruleChecks(d: Design, r: Result): RuleCheck[] {
  const front = facadeAzimuth(d, 'front');
  const back = facadeAzimuth(d, 'back');
  const facingSouth = offSouth(front) <= 30 || offSouth(back) <= 30;
  const northArea = (['front', 'back', 'right', 'left'] as const)
    .filter((f) => offSouth(facadeAzimuth(d, f)) >= 135)
    .reduce((s, f) => s + d.windows[f], 0);
  const minDay = Math.min(r.daylight.front, r.daylight.back);
  const maxDay = Math.max(r.daylight.front, r.daylight.back);
  return [
    { name: 'Face south', ok: facingSouth, why: 'Main windows within 30° of south.' },
    { name: 'Size for daylight', ok: minDay >= 1 && maxDay <= 1.7, why: 'Enough light on both sides, and not much more.' },
    { name: 'Good glass', ok: d.glazing === 'triple' || d.glazing === 'quad', why: 'Triple glazing: U ≤ 0.8, g ≈ 0.5.' },
    { name: 'Mass in the sun', ok: d.mass === 'heavy' || d.mass === 'medium', why: 'Concrete or stone the sun can reach.' },
    { name: 'Shade outside, and move it', ok: d.shading === 'outside', why: 'External blinds that come down when it is warm.' },
    { name: 'Few north windows', ok: northArea <= 12, why: `${num(northArea)} m² of window faces north.` },
  ];
}

export function Final(props: {
  design: Design;
  result: Result;
  score: Score;
  best: number;
  completed: string[];
  bonusDone: boolean;
  onBonus: () => void;
  onKeep: () => void;
  onRestart: () => void;
}) {
  const { result, score } = props;
  const checks = ruleChecks(props.design, result);
  const done = MISSIONS.filter((m) => !m.bonus && props.completed.includes(m.id)).length;
  return (
    <main className="main gutter">
      <div className="final">
        <section className="card final-hero">
          <div className="eyebrow">Your Sun House</div>
          <div className="final-score num">{num(score.total)}</div>
          <Stars count={score.stars} className="final-stars" />
          <p style={{ color: 'var(--ink-2)' }}>
            points · best {num(Math.max(props.best, score.total))} · {done} of {MAIN_MISSIONS} missions
            {props.bonusDone ? ' and the bonus' : ''}
          </p>
        </section>

        <section className="card" style={{ overflow: 'hidden' }}>
          <HouseSection design={props.design} day="oct" canRotate={false} onRotate={() => {}} />
          <div className="house-foot">
            <span>
              Heating <b className="num">{num(result.heating)} kWh</b> a year
            </span>
            <span>
              Above 26 °C <b className="num">{num(result.overheatHours)} h</b>
            </span>
            <span>
              Peak <b className="num">{num(result.peakLoad / 1000, 1)} kW</b> at −20 °C
            </span>
            <span>
              Useful sun <b className="num">{pct(result.usefulShare)}</b>
            </span>
          </div>
        </section>

        <section className="card card-pad">
          <div className="card-head">
            <h2 className="card-title">The six rules in your house</h2>
            <span className="eyebrow">slide 23</span>
          </div>
          <ul className="rules">
            {checks.map((c) => (
              <li className="rule" key={c.name} data-ok={c.ok}>
                <span className="rule-mark" aria-hidden>
                  {c.ok ? <Check size={14} /> : null}
                </span>
                <span>
                  <span className="rule-name">
                    {c.name}
                    <span className="sr-only">{c.ok ? ': yes' : ': not yet'}</span>
                  </span>
                  <span className="rule-why" style={{ display: 'block' }}>
                    {c.why}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="intro-actions" style={{ justifyContent: 'center' }}>
          {!props.bonusDone && (
            <button type="button" className="btn btn-primary btn-lg" onClick={props.onBonus}>
              Bonus: a neighbour moves in <Arrow size={18} />
            </button>
          )}
          <button type="button" className={`btn ${props.bonusDone ? 'btn-primary btn-lg' : ''}`} onClick={props.onKeep}>
            Keep designing
          </button>
          <button type="button" className="btn btn-ghost" onClick={props.onRestart}>
            <Reset /> Start over
          </button>
        </div>
      </div>
    </main>
  );
}
