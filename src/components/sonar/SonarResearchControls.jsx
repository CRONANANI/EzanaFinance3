'use client';

/**
 * SonarResearchControls (Sonar research workspace, Nov 13 2026): the right rail's Research
 * Controls card, above Next steps. Three labelled selects (focus, horizon, data sources) that
 * shape the NEXT research run only, never a finished answer. A quick ping cannot honour them,
 * so with non-default settings the next question runs as standard research, and the card
 * says so. A guest sees the selects disabled. Styles: sonar-research-controls.css (src-).
 */
import { useId } from 'react';
import {
  FOCUS_OPTIONS,
  HORIZON_OPTIONS,
  SOURCE_OPTIONS,
  CONTROL_DEFAULTS,
  isDefaultControls,
} from '@/lib/sonar/research-controls';
import { EzDropdown } from '@/components/ui/ez-dropdown';
import { AnimatedDropdown } from '@/components/ui/animated-dropdown';
import { useResearchControls } from './research-controls-store';
import { useSonarPlan } from './useSonarPlan';
import './sonar-research-controls.css';

/* Nov 18 2026: the Ezana standard dropdown (EzDropdown) replaces the native
   select, so the field matches the app's dropdown standard on every theme. */
function Field({ id, label, value, options, onChange, disabled }) {
  return (
    <div className="src-field">
      <span id={`${id}-label`} className="src-label">
        {label}
      </span>
      <EzDropdown
        id={id}
        block
        label={label}
        value={value}
        disabled={disabled}
        onChange={(v) => onChange(v)}
        options={options.map((o) => ({ value: o.key, label: o.label }))}
      />
    </div>
  );
}

/**
 * variant 'card' (default): the workspace rail's card. 'flat': the same three selects with no
 * card surface, for the answer template's right column (sonar-exemplary-brief.css styles it).
 * 'inline': one compact row, for the Sonar home page above the Ping field (that page's hero is
 * always dark, so the row carries force-dark-theme).
 */
/* Nov 23, 2026: the home page's controls as one glass dock, three segments
   (icon, small label, value) split by hairlines, like a booking search bar.
   The whole segment opens its dropdown (the label points at the trigger); a
   changed setting carries an emerald dot. */
const SEGMENTS = [
  { key: 'focus', label: 'Focus', icon: 'bi-bullseye', options: FOCUS_OPTIONS },
  { key: 'horizon', label: 'Time horizon', icon: 'bi-clock-history', options: HORIZON_OPTIONS },
  { key: 'sources', label: 'Data sources', icon: 'bi-database', options: SOURCE_OPTIONS },
];

function InlineDock({ id, controls, set, guest, custom, onReset }) {
  return (
    <section className="src src--dock force-dark-theme" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="src-sr">
        Research controls
      </h2>
      <div className="src-dock">
        <span className="src-dock__badge" aria-hidden="true" title="Research controls">
          <i className="bi bi-sliders2" />
        </span>
        {SEGMENTS.map((seg) => {
          const fid = `${id}-${seg.key}`;
          const changed = controls[seg.key] !== CONTROL_DEFAULTS[seg.key];
          return (
            <div key={seg.key} className={`src-seg${changed ? ' is-changed' : ''}`}>
              <label className="src-seg__label" htmlFor={`${fid}-trigger`}>
                <i className={`bi ${seg.icon}`} aria-hidden="true" />
                {seg.label}
                {changed ? <span className="src-seg__dot" aria-label="(changed)" /> : null}
              </label>
              {/* Nov 24 2026: the animated dropdown is this dock's default. */}
              <AnimatedDropdown
                id={fid}
                label={seg.label}
                value={controls[seg.key]}
                disabled={guest}
                onChange={(v) => set(seg.key)(v)}
                className="src-seg__dd"
                options={seg.options.map((o) => ({ value: o.key, label: o.label }))}
              />
            </div>
          );
        })}
      </div>
      <p className="src-dock__note">
        {guest ? (
          'Sign in to set research controls.'
        ) : custom ? (
          <>
            Sonar runs standard research with these settings.{' '}
            <button type="button" className="src-reset" onClick={onReset}>
              Reset
            </button>
          </>
        ) : (
          'Applies to your next research run.'
        )}
      </p>
    </section>
  );
}

export function SonarResearchControls({ variant = 'card' }) {
  const id = useId();
  const plan = useSonarPlan();
  const [controls, setControls] = useResearchControls();
  const guest = plan.isGuest;
  const custom = !isDefaultControls(controls);
  const set = (key) => (value) => setControls({ ...controls, [key]: value });
  if (variant === 'inline')
    return (
      <InlineDock
        id={id}
        controls={controls}
        set={set}
        guest={guest}
        custom={custom}
        onReset={() => setControls(CONTROL_DEFAULTS)}
      />
    );
  return (
    <section
      className={
        variant === 'card'
          ? 'san-card src'
          : `src src--${variant}${variant === 'inline' ? ' force-dark-theme' : ''}`
      }
      aria-labelledby={`${id}-h`}
    >
      <h2 id={`${id}-h`} className="san-card-head">
        <i className="bi bi-sliders" aria-hidden="true" />
        Research controls
      </h2>
      <Field
        id={`${id}-focus`}
        label="Focus"
        value={controls.focus}
        options={FOCUS_OPTIONS}
        onChange={set('focus')}
        disabled={guest}
      />
      <Field
        id={`${id}-horizon`}
        label="Time horizon"
        value={controls.horizon}
        options={HORIZON_OPTIONS}
        onChange={set('horizon')}
        disabled={guest}
      />
      <Field
        id={`${id}-sources`}
        label="Data sources"
        value={controls.sources}
        options={SOURCE_OPTIONS}
        onChange={set('sources')}
        disabled={guest}
      />
      {guest ? (
        <p className="src-note">Sign in to set research controls.</p>
      ) : (
        <p className="src-note">
          Applies to your next research run.
          {custom ? (
            <>
              {' '}
              <button
                type="button"
                className="src-reset"
                onClick={() => setControls(CONTROL_DEFAULTS)}
              >
                Reset
              </button>
            </>
          ) : null}
        </p>
      )}
      {!guest && custom ? (
        <p className="src-note src-note--mode">With these settings Sonar runs standard research.</p>
      ) : null}
    </section>
  );
}

export default SonarResearchControls;
