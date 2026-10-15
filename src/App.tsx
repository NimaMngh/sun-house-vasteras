import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { START_DESIGN, type Design } from './sim/design';
import { simulate } from './sim/simulate';
import { noonAltitude } from './sim/weather';
import { score as scoreOf } from './game/score';
import { MAIN_MISSIONS, MISSIONS, snapshot, unlockedControls, type Guess, type Snapshot } from './game/missions';
import { coachTip } from './game/tips';
import { compass, num } from './game/format';
import { TopBar } from './components/TopBar';
import { HouseSection, DAYS, type DayId } from './components/HouseSection';
import { Controls } from './components/Controls';
import { Charts } from './components/Charts';
import { Balance, Coach, FreePanel, MissionPanel, type StepState } from './components/Panels';
import { CompleteModal, Final, Intro } from './components/Screens';
import { clearState, loadState, saveState } from './components/hooks';

type Phase = 'intro' | 'play' | 'final';

interface Saved {
  v: 1;
  phase: Phase;
  mission: number;
  steps: Record<string, 'done' | 'skipped'>;
  freePlay: boolean;
  design: Design;
  guess: Guess | null;
  best: number;
  startSnap: Snapshot | null;
  started: boolean;
  /** when the current mission began, ms */
  startedAt: number;
}

const KEY = 'sun-house-vasteras-v1';

const FRESH: Saved = {
  v: 1,
  phase: 'intro',
  mission: 0,
  steps: {},
  freePlay: false,
  design: START_DESIGN,
  guess: null,
  best: 0,
  startSnap: null,
  started: false,
  startedAt: 0,
};

/** The day the house view opens on in each mission. */
const MISSION_DAY: Record<string, DayId> = {
  south: 'dec',
  daylight: 'oct',
  glass: 'oct',
  paradox: 'mar',
  cool: 'jun',
  master: 'oct',
  neighbour: 'dec',
};

function initialState(): Saved {
  const params = new URLSearchParams(window.location.search);
  if (params.has('reset')) clearState(KEY);
  const saved = loadState<Saved>(KEY);
  const base = saved && saved.v === 1 ? { ...FRESH, ...saved, phase: 'intro' as Phase } : FRESH;
  if (params.has('free')) return { ...base, phase: 'play', freePlay: true, started: true };
  return base;
}

interface Done {
  index: number;
  before: Snapshot;
  after: Snapshot;
}

export default function App() {
  const [state, setState] = useState<Saved>(initialState);
  const [done, setDone] = useState<Done | null>(null);
  const [day, setDay] = useState<DayId>(MISSION_DAY[MISSIONS[state.mission]?.id] ?? 'oct');

  const design = useDeferredValue(state.design);
  const result = useMemo(() => simulate(design), [design]);
  const sc = useMemo(() => scoreOf(result), [result]);
  const settled = design === state.design;

  const mission = MISSIONS[state.mission];
  const open = useMemo(() => {
    const set = unlockedControls(state.mission, state.freePlay);
    const m = MISSIONS[state.mission];
    if (!state.freePlay && m.guess && state.guess === null) m.unlocks.forEach((c) => set.delete(c));
    return set;
  }, [state.mission, state.freePlay, state.guess]);
  const missionDone = state.steps[mission.id] === 'done';
  const fresh = useMemo(
    () => (state.freePlay || missionDone ? new Set<never>() : new Set(mission.unlocks)),
    [state.freePlay, missionDone, mission],
  );

  useEffect(() => saveState(KEY, state), [state]);
  useEffect(() => {
    if (state.phase === 'final') window.scrollTo({ top: 0 });
  }, [state.phase]);

  const update = useCallback((patch: Partial<Saved>) => setState((s) => ({ ...s, ...patch })), []);
  const setDesign = useCallback((d: Design) => setState((s) => ({ ...s, design: d })), []);

  // the snapshot every mission insight compares against
  useEffect(() => {
    if (state.phase === 'play' && !state.freePlay && state.startSnap === null && settled) {
      update({ startSnap: snapshot(result, sc) });
    }
  }, [state.phase, state.freePlay, state.startSnap, settled, result, sc, update]);

  useEffect(() => {
    if (state.phase === 'play' && sc.total > state.best && settled) update({ best: sc.total });
  }, [sc.total, state.best, state.phase, settled, update]);

  // a mission is complete when every goal holds for a moment
  useEffect(() => {
    if (state.phase !== 'play' || state.freePlay || done || missionDone || !settled) return;
    if (mission.guess && state.guess === null) return;
    const allOk = mission.goals.every((g) => g.ok(result, design, sc));
    if (!allOk) return;
    const timer = window.setTimeout(() => {
      const after = { ...snapshot(result, sc), seconds: (Date.now() - state.startedAt) / 1000 };
      setDone({ index: state.mission, before: state.startSnap ?? after, after });
      setState((s) => ({ ...s, steps: { ...s.steps, [mission.id]: 'done' } }));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.freePlay, state.mission, state.guess, state.startSnap, state.startedAt, done, missionDone, settled, mission, result, design, sc]);

  const goTo = useCallback(
    (index: number) => {
      const m = MISSIONS[index];
      setState((s) => ({
        ...s,
        phase: 'play',
        freePlay: false,
        mission: index,
        design: m.setup ? m.setup(s.design) : s.design,
        startSnap: null,
        startedAt: Date.now(),
      }));
      setDay(MISSION_DAY[m.id] ?? 'oct');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  const next = useCallback(() => {
    setDone(null);
    const i = state.mission;
    if (!MISSIONS[i].bonus && i < MAIN_MISSIONS - 1) goTo(i + 1);
    else update({ phase: 'final' });
  }, [state.mission, goTo, update]);

  const skip = useCallback(() => {
    setState((s) => ({ ...s, steps: { ...s.steps, [MISSIONS[s.mission].id]: s.steps[MISSIONS[s.mission].id] ?? 'skipped' } }));
    next();
  }, [next]);

  const start = useCallback(() => {
    setDone(null);
    setState({ ...FRESH, phase: 'play', started: true, best: state.best, startedAt: Date.now() });
    setDay(MISSION_DAY.south);
  }, [state.best]);

  const steps: StepState[] = MISSIONS.map((m, i) =>
    state.steps[m.id] === 'done' ? 'done' : i === state.mission && !state.freePlay ? 'current' : state.steps[m.id] === 'skipped' ? 'skipped' : 'todo',
  );

  if (state.phase === 'intro') {
    return (
      <Intro
        resume={state.started}
        onResume={() => update({ phase: 'play' })}
        onStart={start}
        onFree={() => update({ phase: 'play', freePlay: true, started: true })}
      />
    );
  }

  const nextMission = !mission.bonus && state.mission < MAIN_MISSIONS - 1 ? MISSIONS[state.mission + 1] : null;
  const nextLabel = nextMission ? `Mission ${state.mission + 2}` : 'See my house';

  if (state.phase === 'final') {
    return (
      <>
        <TopBar result={result} score={sc} subtitle="Your house" />
        <Final
          design={state.design}
          result={result}
          score={sc}
          best={state.best}
          completed={Object.keys(state.steps).filter((k) => state.steps[k] === 'done')}
          bonusDone={state.steps.neighbour === 'done'}
          onBonus={() => goTo(MISSIONS.findIndex((m) => m.bonus))}
          onKeep={() => update({ phase: 'play', freePlay: true })}
          onRestart={start}
        />
      </>
    );
  }

  const dayInfo = DAYS.find((d) => d.id === day)!;
  const alpha = noonAltitude(dayInfo.n);

  return (
    <>
      <TopBar
        result={result}
        score={sc}
        subtitle={state.freePlay ? 'Free design' : `${mission.bonus ? 'Bonus' : `Mission ${state.mission + 1}`} · ${mission.title}`}
        goals={
          state.freePlay || missionDone || (mission.guess && state.guess === null)
            ? undefined
            : mission.goals.map((g) => ({ short: g.short, ok: g.ok(result, design, sc) }))
        }
      />
      <main className="main gutter">
        <div className="wrap layout">
          <div className="area-side">
            {state.freePlay ? (
              <FreePanel
                score={sc}
                best={state.best}
                onFinish={() => update({ phase: 'final' })}
                onMissions={() => update({ freePlay: false })}
              />
            ) : (
              <MissionPanel
                index={state.mission}
                mission={mission}
                design={design}
                result={result}
                score={sc}
                steps={steps}
                guess={state.guess}
                startedAt={state.startedAt}
                done={missionDone}
                nextLabel={nextLabel}
                onGuess={(g) => update({ guess: g })}
                onNext={next}
                onSkip={skip}
                onFinish={() => update({ phase: 'final' })}
              />
            )}
            <Coach tip={coachTip(design, result, open)} />
          </div>

          <section className="area-house card" aria-label="The house" style={{ overflow: 'hidden' }}>
            <div className="house-head">
              <div>
                <div className="eyebrow">Section at noon</div>
                <h2 className="card-title num">
                  {dayInfo.label}
                  {day === 'oct' ? ' (today)' : ''}: sun {num(alpha)}° high
                </h2>
              </div>
              <div className="seg" role="group" aria-label="Day">
                {DAYS.map((d) => (
                  <button key={d.id} type="button" aria-pressed={day === d.id} onClick={() => setDay(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <HouseSection
              design={state.design}
              day={day}
              canRotate={open.has('orientation')}
              onRotate={(deg) => setDesign({ ...state.design, orientation: deg })}
            />
            <div className="house-foot">
              <span>
                Front faces <b>{compass(state.design.orientation)}</b>
              </span>
              <span>
                Windows <b className="num">{num(Object.values(state.design.windows).reduce((a, b) => a + b, 0))} m²</b>
              </span>
              <span>
                Sun through them <b className="num">{num(result.solar)} kWh</b> a year
              </span>
              {open.has('orientation') && <span>Drag the compass to turn the house.</span>}
            </div>
          </section>

          <div className="area-controls">
            <Controls design={state.design} result={result} open={open} fresh={fresh} missionIndex={state.mission} onChange={setDesign} />
          </div>

          <div className="area-charts">
            <Charts result={result} />
          </div>

          <div className="area-balance">
            <Balance result={result} score={sc} design={design} />
          </div>
        </div>
      </main>
      <footer className="footer gutter">
        <div className="wrap footer-inner">
          <span>
            Hourly heat balance of one zone (ISO 13790, 5R1C) over a typical Västerås year, calibrated to the monthly sun on
            the lecture slides. Made for learning, not for design.
          </span>
          <button type="button" className="linkish" onClick={start}>
            Start over
          </button>
        </div>
      </footer>
      {done && (
        <CompleteModal
          mission={MISSIONS[done.index]}
          index={done.index}
          before={done.before}
          after={done.after}
          guess={state.guess}
          next={!MISSIONS[done.index].bonus && done.index < MAIN_MISSIONS - 1 ? MISSIONS[done.index + 1] : null}
          onNext={next}
          onStay={() => setDone(null)}
        />
      )}
    </>
  );
}
