import { useEffect, useState } from 'react';
import { FACADES, GLAZING, facadeAzimuth, type Design } from '../sim/design';
import type { Result } from '../sim/simulate';
import { MAX_POINTS, type Score } from '../game/score';
import { MISSIONS, formatTime, type Guess, type Mission } from '../game/missions';
import type { Tip } from '../game/tips';
import { compass, num, pct } from '../game/format';
import { Arrow, Bulb, Check, Stars, SunIcon } from './icons';

export type StepState = 'done' | 'skipped' | 'current' | 'todo';

export function MissionPanel(props: {
  index: number;
  mission: Mission;
  design: Design;
  result: Result;
  score: Score;
  steps: StepState[];
  guess: Guess | null;
  startedAt: number;
  done: boolean;
  nextLabel: string;
  onGuess: (g: Guess) => void;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const { mission, result, design, score } = props;
  const [hintFor, setHintFor] = useState<string | null>(null);
  const showHint = hintFor === mission.id;
  const needsGuess = mission.guess && props.guess === null;
  const [now, setNow] = useState(() => Date.now());
  const ticking = mission.timed && !props.done;
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  return (
    <section className="card card-pad" aria-labelledby="mission-title">
      <div className="mission-steps" aria-label="Missions">
        {MISSIONS.map((m, i) => (
          <span key={m.id} style={{ display: 'contents' }}>
            {i > 0 && <span className="step-line" />}
            <span
              className={`step-dot ${m.bonus ? 'bonus' : ''}`}
              data-state={props.steps[i]}
              title={`${m.bonus ? 'Bonus' : `Mission ${i + 1}`}: ${m.title}`}
            >
              {props.steps[i] === 'done' ? <Check size={14} /> : m.bonus ? '+' : i + 1}
            </span>
          </span>
        ))}
      </div>
      <div className="eyebrow">
        {mission.bonus ? 'Bonus mission' : `Mission ${props.index + 1} of ${MISSIONS.filter((m) => !m.bonus).length}`} · {mission.tag}
      </div>
      <h1 id="mission-title" className="mission-title">
        {mission.title}
        {ticking && props.startedAt > 0 && (
          <span className="clock num" aria-label="Time on this mission">
            {formatTime((now - props.startedAt) / 1000)}
          </span>
        )}
      </h1>
      <p className="mission-brief">{mission.brief(result)}</p>

      {mission.guess && (
        <div className="guess">
          <div className="guess-q">{mission.guess.question}</div>
          <div className="guess-options">
            {mission.guess.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`btn ${props.guess === o.id ? 'btn-primary' : ''}`}
                aria-pressed={props.guess === o.id}
                disabled={props.guess !== null}
                onClick={() => props.onGuess(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          {props.guess !== null && (
            <p className="guess-result">
              Noted. Now switch the house to <b>Passive house</b> under Insulation, and watch the useful share in the sun card.
              Right now <b>{pct(result.usefulShare)}</b> of the sun through the windows saves heating.
            </p>
          )}
        </div>
      )}

      {!needsGuess && (
        <ul className="goals">
          {mission.goals.map((g) => {
            const ok = g.ok(result, design, score);
            return (
              <li className="goal" key={g.label} data-ok={ok}>
                <span className="goal-mark" aria-hidden>
                  {ok && <Check size={14} />}
                </span>
                <span className="goal-label">
                  {g.label}
                  <span className="sr-only">{ok ? ', done' : ', not yet'}</span>
                </span>
                <span className="goal-value num">{g.value(result, design, score)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {showHint && <p className="hint">{mission.hint}</p>}

      <div className="mission-actions">
        {!showHint && (
          <button type="button" className="btn" onClick={() => setHintFor(mission.id)}>
            <Bulb size={16} /> Hint
          </button>
        )}
        {props.done ? (
          <button type="button" className="btn btn-primary" onClick={props.onNext}>
            {props.nextLabel} <Arrow size={14} />
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={props.onSkip}>
            Skip <Arrow size={14} />
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost" onClick={props.onFinish}>
          See my house
        </button>
      </div>
    </section>
  );
}

export function FreePanel(props: { score: Score; best: number; onFinish: () => void; onMissions: () => void }) {
  return (
    <section className="card card-pad">
      <div className="eyebrow">Free design</div>
      <h1 className="mission-title">Your best house</h1>
      <p className="mission-brief">
        Every control is open. Change anything and the house runs through the whole year again: 8 760 hours of Västerås weather.
      </p>
      <div className="modal-score" style={{ marginTop: 12 }}>
        Best so far <b className="num">{num(Math.max(props.best, props.score.total))}</b> points
        <Stars count={props.score.stars} className="final-stars" />
      </div>
      <div className="mission-actions">
        <button type="button" className="btn btn-primary" onClick={props.onFinish}>
          See my house
        </button>
        <button type="button" className="btn btn-ghost" onClick={props.onMissions}>
          Back to the missions
        </button>
      </div>
    </section>
  );
}

export function Coach({ tip }: { tip: Tip | null }) {
  return (
    <aside className="coach" aria-live="polite">
      <span className="coach-face" aria-hidden>
        <SunIcon size={20} />
      </span>
      <p className="coach-text">
        {tip ? (
          <>
            {tip.text}
            {tip.rule && <span className="coach-rule">{tip.rule}</span>}
          </>
        ) : (
          'No obvious weak spot left. Fine-tune the windows and watch the four ratings.'
        )}
      </p>
    </aside>
  );
}

function Rating(props: { name: string; detail: string; points: number; max: number; color: string }) {
  return (
    <div className="bd-row">
      <div className="bd-name">
        {props.name}
        <small>{props.detail}</small>
      </div>
      <div className="bd-track" aria-hidden>
        <div className="bd-fill" style={{ width: `${(props.points / props.max) * 100}%`, background: props.color }} />
      </div>
      <div className="bd-pts num">
        {Math.round(props.points)}
        <small>/{props.max}</small>
      </div>
    </div>
  );
}

export function Balance({ result, score, design }: { result: Result; score: Score; design: Design }) {
  const useful = result.usefulShare * result.solar;
  const wasted = Math.max(0, result.solar - useful);
  const usefulPct = result.solar > 0 ? (useful / result.solar) * 100 : 0;
  return (
    <section className="card card-pad balance" aria-label="Score and sun balance">
      <div>
        <div className="card-head">
          <h2 className="card-title">The score</h2>
          <span className="eyebrow num">{num(score.total)} / 1000</span>
        </div>
        <div className="breakdown">
          <Rating
            name="Heating"
            detail={`${num(result.heating / 150, 1)} kWh/m² a year`}
            points={score.heating}
            max={MAX_POINTS.heating}
            color="var(--heat)"
          />
          <Rating
            name="Summer comfort"
            detail={`${num(result.overheatHours)} h above 26 °C`}
            points={score.comfort}
            max={MAX_POINTS.comfort}
            color="var(--accent)"
          />
          <Rating
            name="Daylight"
            detail={`${pct(Math.min(result.daylight.front, result.daylight.back))} on the darker side`}
            points={score.daylight}
            max={MAX_POINTS.daylight}
            color="var(--sun)"
          />
          <Rating
            name="Peak power"
            detail={`${num(result.peakLoad / 150)} W/m² at −20 °C`}
            points={score.peak}
            max={MAX_POINTS.peak}
            color="var(--cool)"
          />
        </div>
      </div>

      <div className="sun-flow">
        <div className="card-head" style={{ marginBottom: 2 }}>
          <h2 className="card-title">The sun through your windows</h2>
        </div>
        <div className="sun-bar" role="img" aria-label={`${pct(result.usefulShare)} of the sun through the windows saves heating`}>
          <span style={{ width: `${usefulPct}%`, background: 'var(--sun)' }} />
          <span style={{ width: `${100 - usefulPct}%`, background: 'var(--line-strong)' }} />
        </div>
        <div className="legend" style={{ padding: 0 }}>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--sun)' }} /> saves heating
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'var(--line-strong)' }} /> comes when no heat is needed
          </span>
        </div>
        <div className="sun-facts">
          <div>
            <div className="fact-label">Sun in</div>
            <div className="fact-value num">
              {num(result.solar)} <small>kWh</small>
            </div>
          </div>
          <div>
            <div className="fact-label">Useful as heat</div>
            <div className="fact-value num">
              {pct(result.usefulShare)} <small>{num(useful)} kWh</small>
            </div>
          </div>
          <div>
            <div className="fact-label">Not needed</div>
            <div className="fact-value num">
              {num(wasted)} <small>kWh</small>
            </div>
          </div>
        </div>
      </div>
      <Workings result={result} design={design} />
    </section>
  );
}

/** The calculation behind the numbers, with this house's own values. */
function Workings({ result, design }: { result: Result; design: Design }) {
  const glass = GLAZING[design.glazing];
  const area = Object.values(design.windows).reduce((a, b) => a + b, 0);
  const h = result.loss.windows + result.loss.opaque + result.loss.ventilation;
  const b = result.balance;
  const into = b.heating + b.internal + b.sun;
  const saved = result.heatingNoSun - result.heating;
  const role = { front: 'front', back: 'back', right: 'gable', left: 'gable' } as const;
  return (
    <details className="calc">
      <summary>How these numbers are calculated</summary>
      <div className="calc-body">
        <section>
          <h3>Peak heat on the coldest day (slide 22)</h3>
          <table className="calc-table">
            <tbody>
              <tr>
                <td>Windows: {num(area)} m² × U {num(glass.u, 1)}</td>
                <td className="num">{num(result.loss.windows, 1)} W/K</td>
              </tr>
              <tr>
                <td>Walls, roof and floor, with thermal bridges</td>
                <td className="num">{num(result.loss.opaque, 1)} W/K</td>
              </tr>
              <tr>
                <td>Ventilation and air leaks</td>
                <td className="num">{num(result.loss.ventilation, 1)} W/K</td>
              </tr>
              <tr className="calc-total">
                <td>Heat loss coefficient H</td>
                <td className="num">{num(h, 1)} W/K</td>
              </tr>
            </tbody>
          </table>
          <p className="calc-eq num">
            P = H × (21 − (−20)) K = {num(h, 1)} × 41 = <b>{num(result.peakLoad)} W</b>
          </p>
        </section>

        <section>
          <h3>One year, hour by hour</h3>
          <p>
            8 760 hours of Västerås weather. Every hour: the sun on each facade, through glass, overhang or blinds; heat stored
            in and released from the thermal mass; heating to keep 21 °C (ISO 13790, 5R1C).
          </p>
          <table className="calc-table">
            <tbody>
              <tr>
                <td>Heating</td>
                <td className="num">{num(b.heating)} kWh</td>
              </tr>
              <tr>
                <td>People and appliances</td>
                <td className="num">{num(b.internal)} kWh</td>
              </tr>
              <tr>
                <td>Sun through the windows</td>
                <td className="num">{num(b.sun)} kWh</td>
              </tr>
              <tr className="calc-total">
                <td>Heat in</td>
                <td className="num">{num(into)} kWh</td>
              </tr>
              <tr>
                <td>Out through the windows</td>
                <td className="num">{num(b.windows)} kWh</td>
              </tr>
              <tr>
                <td>Out through walls, roof and floor</td>
                <td className="num">{num(b.opaque)} kWh</td>
              </tr>
              <tr>
                <td>Out with the air (ventilation, leaks, airing)</td>
                <td className="num">{num(b.ventilation)} kWh</td>
              </tr>
              <tr>
                <td>Left in the thermal mass</td>
                <td className="num">{num(b.stored)} kWh</td>
              </tr>
              <tr className="calc-total">
                <td>Heat out</td>
                <td className="num">{num(b.windows + b.opaque + b.ventilation + b.stored)} kWh</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Useful share of the sun (slide 12, η)</h3>
          <p>The same year is run a second time with no sun through the windows.</p>
          <p className="calc-eq num">
            ({num(result.heatingNoSun)} − {num(result.heating)}) kWh ÷ {num(result.solar)} kWh = <b>{pct(result.usefulShare)}</b>
          </p>
          <p>
            Heating without the sun minus heating with it, divided by the sun that came in. The sun saved {num(saved)} kWh;
            the rest came when the house was already warm.
          </p>
        </section>

        <section>
          <h3>Sun through each facade</h3>
          <table className="calc-table">
            <tbody>
              {FACADES.filter((f) => design.windows[f] > 0).map((f) => (
                <tr key={f}>
                  <td>
                    {compass(facadeAzimuth(design, f))} {role[f]}: {num(design.windows[f])} m² × 0.7 glass × g {num(glass.g, 2)} × sun
                  </td>
                  <td className="num">{num(result.solarByFacade[f])} kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </details>
  );
}
