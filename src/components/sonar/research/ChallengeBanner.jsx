'use client';

/**
 * ChallengeBanner: the result of challenge mode (Sonar for organizations,
 * Nov 2026). The conclusion that was tested, Sonar's verdict on it (holds,
 * weakened, refuted, cannot be tested from the records) and what survives
 * and what does not. The rest of the report below is the challenge's own
 * research. Tokens only (EZANA_BRANDING_GUIDE), prefix `sch-`.
 */
import { Cites } from './InvestmentMemo';
import './fund-fit-memo.css';

const VERDICT = {
  holds: { label: 'The conclusion holds', icon: 'bi-shield-check' },
  weakened: { label: 'The conclusion is weakened', icon: 'bi-shield-exclamation' },
  refuted: { label: 'The records contradict it', icon: 'bi-shield-x' },
  unclear: { label: 'The records cannot test it', icon: 'bi-question-circle' },
};

export default function ChallengeBanner({ challenge, onCite }) {
  if (!challenge) return null;
  const v = VERDICT[challenge.verdict] || VERDICT.unclear;
  return (
    <section className={`sch is-${challenge.verdict}`} aria-labelledby="sch-h">
      <p className="sff-eyebrow">Challenge</p>
      <h2 id="sch-h" className="sch-verdict">
        <i className={`bi ${v.icon}`} aria-hidden="true" /> {v.label}
      </h2>
      {challenge.claim ? (
        <blockquote className="sff-thesis">
          <span className="sch-label">Conclusion tested</span>
          {challenge.claim}
        </blockquote>
      ) : null}
      {challenge.assessment?.text ? (
        <p className="sff-why">
          {challenge.assessment.text}{' '}
          <Cites markers={challenge.assessment.markers} onCite={onCite} />
        </p>
      ) : null}
      {challenge.survives?.length || challenge.doesNotSurvive?.length ? (
        <div className="sff-two">
          <div>
            <p className="sch-label">What survives</p>
            <ul className="srr-list">
              {(challenge.survives || []).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="sch-label">What does not</p>
            <ul className="srr-list">
              {(challenge.doesNotSurvive || []).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
