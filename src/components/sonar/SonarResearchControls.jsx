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
import { useResearchControls } from './research-controls-store';
import { useSonarPlan } from './useSonarPlan';
import './sonar-research-controls.css';

function Field({ id, label, value, options, onChange, disabled }) {
  return (
    <div className="src-field">
      <label htmlFor={id} className="src-label">
        {label}
      </label>
      <select
        id={id}
        className="src-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SonarResearchControls() {
  const id = useId();
  const plan = useSonarPlan();
  const [controls, setControls] = useResearchControls();
  const guest = plan.isGuest;
  const custom = !isDefaultControls(controls);
  const set = (key) => (value) => setControls({ ...controls, [key]: value });
  return (
    <section className="san-card src" aria-labelledby={`${id}-h`}>
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
