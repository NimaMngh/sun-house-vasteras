import { Fragment, type ReactNode } from 'react';
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
import { MISSIONS, unlockMission, type Control } from '../game/missions';
import { compass, compassName, num, pct } from '../game/format';
import { Lock } from './icons';

interface Props {
  design: Design;
  result: Result;
  open: Set<Control>;
  fresh: Set<Control>;
  /** current mission, to word the lock of a control that waits for the guess */
  missionIndex: number;
  onChange: (d: Design) => void;
}

const FACADE_ORDER: Facade[] = ['front', 'back', 'right', 'left'];
const FACADE_ROLE: Record<Facade, string> = { front: 'Front', back: 'Back', right: 'Gable', left: 'Gable' };

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

function Group(props: { title: string; tag: string; fresh: boolean; children: ReactNode }) {
  return (
    <section className="ctrl" data-new={props.fresh}>
      <div className="ctrl-head">
        <h3 className="ctrl-title">
          {props.title}
          {props.fresh && <span className="ctrl-new">New</span>}
        </h3>
        <span className="tag">{props.tag}</span>
      </div>
      {props.children}
    </section>
  );
}

function Locked({ control, title, current }: { control: Control; title: string; current: number }) {
  const m = unlockMission(control);
  const when = m === current ? 'opens after your guess' : MISSIONS[m]?.bonus ? 'opens in the bonus mission' : `opens in mission ${m + 1}`;
  return (
    <div className="locked">
      <Lock />
      <span>
        {title} · {when}
      </span>
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

export function Controls({ design, result, open, fresh, missionIndex, onChange }: Props) {
  const set = <K extends keyof Design>(key: K, value: Design[K]) => onChange({ ...design, [key]: value });
  const setWindow = (f: Facade, v: number) => onChange({ ...design, windows: { ...design.windows, [f]: v } });

  const groups: { control: Control; title: string; node: () => ReactNode }[] = [
    {
      control: 'orientation',
      title: 'Orientation',
      node: () => (
        <Group title="Orientation" tag="Rule 1 · Face south" fresh={fresh.has('orientation')}>
          <Slider
            id="orientation"
            label={
              <>
                Front faces
                <small>drag the compass too</small>
              </>
            }
            value={design.orientation}
            min={0}
            max={345}
            step={15}
            display={`${compass(design.orientation)} ${design.orientation}°`}
            onChange={(v) => set('orientation', v)}
          />
        </Group>
      ),
    },
    {
      control: 'windows',
      title: 'Windows',
      node: () => (
        <Group title="Window area" tag="Rules 2 and 6 · Daylight, few north windows" fresh={fresh.has('windows')}>
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
        </Group>
      ),
    },
    {
      control: 'glazing',
      title: 'Glass',
      node: () => (
        <Group title="Glass" tag="Rule 3 · Good glass" fresh={fresh.has('glazing')}>
          <Options<Glazing>
            name="glazing"
            value={design.glazing}
            onChange={(v) => set('glazing', v)}
            options={[
              { id: 'double', name: 'Double', spec: specGlass('double') },
              { id: 'triple', name: 'Triple', spec: specGlass('triple') },
              { id: 'solar', name: 'Triple, solar control', spec: specGlass('solar') },
              { id: 'quad', name: 'Quadruple', spec: specGlass('quad') },
            ]}
          />
        </Group>
      ),
    },
    {
      control: 'envelope',
      title: 'Insulation',
      node: () => (
        <Group title="Insulation and ventilation" tag="Slide 18 · How good is the house" fresh={fresh.has('envelope')}>
          <Options<Envelope>
            name="envelope"
            value={design.envelope}
            onChange={(v) => set('envelope', v)}
            columns="three"
            options={[
              { id: 'old', name: '1970s house', spec: specEnvelope('old') },
              { id: 'code', name: 'New build', spec: specEnvelope('code') },
              { id: 'passive', name: 'Passive house', spec: specEnvelope('passive') },
            ]}
          />
        </Group>
      ),
    },
    {
      control: 'shading',
      title: 'Shading',
      node: () => (
        <Group title="Shading" tag="Rule 5 · Shade outside, and move it" fresh={fresh.has('shading')}>
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
        </Group>
      ),
    },
    {
      control: 'mass',
      title: 'Thermal mass',
      node: () => (
        <Group title="Thermal mass" tag="Rule 4 · Mass in the sun" fresh={fresh.has('mass')}>
          <Options<Mass>
            name="mass"
            value={design.mass}
            onChange={(v) => set('mass', v)}
            options={[
              { id: 'light', name: 'Light timber', spec: 'wood floors, plasterboard' },
              { id: 'carpet', name: 'Concrete under carpet', spec: 'heavy, but covered' },
              { id: 'medium', name: 'Medium', spec: 'concrete slab, wood floor' },
              { id: 'heavy', name: 'Heavy, exposed', spec: 'bare concrete floors and walls' },
            ]}
          />
        </Group>
      ),
    },
    {
      control: 'summer',
      title: 'Summer ventilation',
      node: () => (
        <Group title="Summer ventilation" tag="Slide 20 · Bypass and night air" fresh={fresh.has('summer')}>
          <label className="switch" htmlFor="summer">
            <span className="switch-text">
              Bypass the heat recovery and air the house on warm nights
              <small>Off: the heat recovery warms the fresh air all year</small>
            </span>
            <input
              id="summer"
              type="checkbox"
              role="switch"
              checked={design.summerMode}
              onChange={(e) => set('summerMode', e.target.checked)}
            />
            <span className="switch-track" aria-hidden />
          </label>
        </Group>
      ),
    },
    {
      control: 'site',
      title: 'Plot',
      node: () => (
        <Group title="Plot" tag="Task 1 · The neighbour" fresh={fresh.has('site')}>
          <Options<Site>
            name="site"
            value={design.site}
            onChange={(v) => set('site', v)}
            options={[
              { id: 'open', name: 'Open field', spec: 'nothing in front of the sun' },
              { id: 'city', name: 'City plot', spec: '12 m building, 25 m to the south' },
            ]}
          />
        </Group>
      ),
    },
  ];

  return (
    <div className="card controls" aria-label="Design controls">
      {groups.map((g) =>
        open.has(g.control) ? <Fragment key={g.control}>{g.node()}</Fragment> : <Locked key={g.control} control={g.control} title={g.title} current={missionIndex} />,
      )}
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

