import type { ReactNode } from 'react';
import {
  Design,
  ENVELOPE,
  Facade,
  GLAZING,
  WINDOW_MAX,
  facadeAzimuth,
  type Envelope,
  type Glazing,
  type Mass,
  type Shading,
  type Site,
} from '../sim/design';
import type { Result } from '../sim/simulate';
import { ALL_CONTROLS, type Control } from '../game/missions';
import { compass, compassName, num, pct } from '../game/format';

interface Props {
  design: Design;
  result: Result;
  /** controls the student can use */
  open: Set<Control>;
  /** controls of the current mission: shown in full */
  current: Set<Control>;
  /** show every open control in full (the last missions and free design) */
  expandAll: boolean;
  onChange: (d: Design) => void;
}

const FACADE_ORDER: Facade[] = ['front', 'back', 'right', 'left'];
const FACADE_ROLE: Record<Facade, string> = { front: 'Front', back: 'Back', right: 'Gable', left: 'Gable' };

const GLAZING_NAME: Record<Glazing, string> = {
  double: 'Double',
  triple: 'Triple',
  solar: 'Triple, solar control',
  quad: 'Quadruple',
};
const ENVELOPE_NAME: Record<Envelope, string> = { old: '1970s house', code: 'New build', passive: 'Passive house' };
const MASS_NAME: Record<Mass, string> = {
  light: 'Light timber',
  carpet: 'Concrete under carpet',
  medium: 'Medium',
  heavy: 'Heavy, exposed',
};

function Options<T extends string>(props: {
  name: string;
  value: T;
  options: { id: T; name: string; spec: string }[];
  onChange: (v: T) => void;
  columns?: 'two' | 'three';
}) {
  return (
    <div className={`opts ${props.columns === 'three' ? 'three' : ''}`} role="radiogroup">
      {props.options.map((o) => (
        <label className="opt" key={o.id}>
          <input
            type="radio"
            id={`${props.name}-${o.id}`}
            name={props.name}
            checked={props.value === o.id}
            onChange={() => props.onChange(o.id)}
          />
          <span className="opt-body">
            <span className="opt-name">{o.name}</span>
            <span className="opt-spec">{o.spec}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Slider(props: {
  id: string;
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const fill = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="slider-row">
      <label className="slider-label" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="slider-value">{props.display}</span>
    </div>
  );
}

function DayBar({ label, value }: { label: string; value: number }) {
  const max = 2;
  const ok = value >= 1;
  return (
    <div className="daybar">
      <div>
        {label}: <b>{ok ? 'enough light' : `${pct(value)} of what it needs`}</b>
      </div>
      <div className="daybar-track" aria-hidden>
        <div
          className="daybar-fill"
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: ok ? 'var(--good)' : 'var(--bad)' }}
        />
        <div className="daybar-mark" style={{ left: `${(1 / max) * 100}%` }} />
      </div>
    </div>
  );
}

function specGlass(g: Glazing) {
  const s = GLAZING[g];
  return `U ${num(s.u, 1)} · g ${num(s.g, 2)} · light ${Math.round(s.lt * 100)} %`;
}

function specEnvelope(e: Envelope) {
  const s = ENVELOPE[e];
  return `wall U ${num(s.uWall, 2)} · ${s.recovery > 0 ? `heat recovery ${Math.round(s.recovery * 100)} %` : 'no heat recovery'}`;
}

export function Controls({ design, result, open, current, expandAll, onChange }: Props) {
  const set = <K extends keyof Design>(key: K, value: Design[K]) => onChange({ ...design, [key]: value });
  const setWindow = (f: Facade, v: number) => onChange({ ...design, windows: { ...design.windows, [f]: v } });
  const windowTotal = Object.values(design.windows).reduce((a, b) => a + b, 0);

  const defs: Record<Control, { title: string; tag: string; summary: string; body: ReactNode }> = {
    orientation: {
      title: 'Orientation',
      tag: 'Rule 1',
      summary: `${compass(design.orientation)} ${design.orientation}°`,
      body: (
        <Slider
          id="orientation"
          label={
            <>
              Front faces
              <small>or drag the compass</small>
            </>
          }
          value={design.orientation}
          min={0}
          max={345}
          step={15}
          display={`${compass(design.orientation)} ${design.orientation}°`}
          onChange={(v) => set('orientation', v)}
        />
      ),
    },
    windows: {
      title: 'Window area',
      tag: 'Rules 2 and 6',
      summary: `${num(windowTotal)} m²`,
      body: (
        <>
          {FACADE_ORDER.map((f) => {
            const az = facadeAzimuth(design, f);
            return (
              <Slider
                key={f}
                id={`win-${f}`}
                label={
                  <>
                    {FACADE_ROLE[f]} · {compass(az)}
                    <small>faces {compassName(az)}</small>
                  </>
                }
                value={design.windows[f]}
                min={0}
                max={WINDOW_MAX[f]}
                step={1}
                display={`${design.windows[f]} m²`}
                onChange={(v) => setWindow(f, v)}
              />
            );
          })}
          <div className="daylight-row">
            <DayBar label={`${compass(facadeAzimuth(design, 'front'))} rooms`} value={result.daylight.front} />
            <DayBar label={`${compass(facadeAzimuth(design, 'back'))} rooms`} value={result.daylight.back} />
          </div>
        </>
      ),
    },
    glazing: {
      title: 'Glass',
      tag: 'Rule 3',
      summary: GLAZING_NAME[design.glazing],
      body: (
        <Options<Glazing>
          name="glazing"
          value={design.glazing}
          onChange={(v) => set('glazing', v)}
          options={(['double', 'triple', 'solar', 'quad'] as Glazing[]).map((id) => ({ id, name: GLAZING_NAME[id], spec: specGlass(id) }))}
        />
      ),
    },
    envelope: {
      title: 'Insulation',
      tag: 'Slide 19',
      summary: ENVELOPE_NAME[design.envelope],
      body: (
        <Options<Envelope>
          name="envelope"
          value={design.envelope}
          onChange={(v) => set('envelope', v)}
          columns="three"
          options={(['old', 'code', 'passive'] as Envelope[]).map((id) => ({ id, name: ENVELOPE_NAME[id], spec: specEnvelope(id) }))}
        />
      ),
    },
    shading: {
      title: 'Shading',
      tag: 'Rule 5',
      summary: { none: 'None', overhang: `Overhang ${num(design.overhang, 1)} m`, inside: 'Blinds inside', outside: 'Blinds outside' }[design.shading],
      body: (
        <>
          <Options<Shading>
            name="shading"
            value={design.shading}
            onChange={(v) => set('shading', v)}
            options={[
              { id: 'none', name: 'None', spec: 'all the sun comes in' },
              { id: 'overhang', name: 'Fixed overhang', spec: 'over every window' },
              { id: 'inside', name: 'Blinds inside', spec: 'down when the room is warm' },
              { id: 'outside', name: 'Blinds outside', spec: 'down when the room is warm' },
            ]}
          />
          {design.shading === 'overhang' && (
            <div style={{ marginTop: 10 }}>
              <Slider
                id="overhang"
                label="Overhang depth"
                value={design.overhang}
                min={0.2}
                max={1.6}
                step={0.1}
                display={`${num(design.overhang, 1)} m`}
                onChange={(v) => set('overhang', v)}
              />
            </div>
          )}
        </>
      ),
    },
    mass: {
      title: 'Thermal mass',
      tag: 'Rule 4',
      summary: MASS_NAME[design.mass],
      body: (
        <Options<Mass>
          name="mass"
          value={design.mass}
          onChange={(v) => set('mass', v)}
          options={[
            { id: 'light', name: MASS_NAME.light, spec: 'wood floors, plasterboard' },
            { id: 'carpet', name: MASS_NAME.carpet, spec: 'heavy, but covered' },
            { id: 'medium', name: MASS_NAME.medium, spec: 'concrete slab, wood floor' },
            { id: 'heavy', name: MASS_NAME.heavy, spec: 'bare concrete floors and walls' },
          ]}
        />
      ),
    },
    site: {
      title: 'Plot',
      tag: 'Task 1',
      summary: design.site === 'city' ? 'City plot' : 'Open field',
      body: (
        <Options<Site>
          name="site"
          value={design.site}
          onChange={(v) => set('site', v)}
          options={[
            { id: 'open', name: 'Open field', spec: 'nothing in front of the sun' },
            { id: 'city', name: 'City plot', spec: '12 m building, 25 m to the south' },
          ]}
        />
      ),
    },
  };

  const shown = ALL_CONTROLS.filter((c) => open.has(c));
  const full = shown.filter((c) => expandAll || current.has(c));
  const earlier = shown.filter((c) => !full.includes(c));

  return (
    <div className="card controls" aria-label="Design controls">
      {full.map((c) => (
        <section className="ctrl" key={c}>
          <div className="ctrl-head">
            <h3 className="ctrl-title">{defs[c].title}</h3>
            <span className="tag">{defs[c].tag}</span>
          </div>
          {defs[c].body}
        </section>
      ))}
      {earlier.length > 0 && (
        <div className="earlier">
          <div className="earlier-head">Your earlier choices</div>
          {earlier.map((c) => (
            <details className="ctrl-sum" key={c}>
              <summary>
                <span>{defs[c].title}</span>
                <span className="num">{defs[c].summary}</span>
              </summary>
              <div className="ctrl-sum-body">{defs[c].body}</div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
