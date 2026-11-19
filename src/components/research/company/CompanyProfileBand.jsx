'use client';

/**
 * Company Profile band (Nov 19th, 2026 redesign). Sits between the stock
 * chart and the research tabs and stays the same on every tab. Facts come
 * from the FMP company profile in the shared snapshot (useCompanyResearch);
 * a field FMP does not carry is left out, never filled in. FMP has no
 * founding year, so the band shows the IPO date under that name.
 */
import { useState } from 'react';
import { fmtCount, fmtDay } from './ux-shared';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function CompanyProfileBand({ profile }) {
  const [open, setOpen] = useState(false);
  const d = profile?.details;
  if (!profile) return null;
  if (profile.status === 'loading') {
    return (
      <section className="ux-profile" aria-label="Company profile" aria-busy="true">
        <span className="rc-skel rc-skel--line" />
        <span className="rc-skel rc-skel--line" />
      </section>
    );
  }
  if (!d) return null;

  const hq = [d.city, d.state, d.country].filter(Boolean).join(', ');
  const host = d.website ? hostOf(d.website) : null;
  const facts = [
    hq ? { icon: 'bi-geo-alt', label: 'Headquarters', value: hq } : null,
    d.ipoDate ? { icon: 'bi-calendar3', label: 'IPO date', value: fmtDay(d.ipoDate) } : null,
    d.employees
      ? { icon: 'bi-people', label: 'Employees', value: `${fmtCount(d.employees)} full time` }
      : null,
    d.ceo ? { icon: 'bi-person', label: 'CEO', value: d.ceo } : null,
    host ? { icon: 'bi-globe2', label: 'Website', value: host, href: d.website } : null,
  ].filter(Boolean);

  return (
    <section className="ux-profile" aria-labelledby="ux-profile-title">
      <div className="ux-profile__about">
        <h2 id="ux-profile-title" className="ux-profile__title">
          <i className="bi bi-building" aria-hidden="true" /> Company profile
        </h2>
        {d.description ? (
          <>
            <p id="ux-profile-desc" className={`ux-profile__desc${open ? ' is-open' : ''}`}>
              {d.description}
            </p>
            <button
              type="button"
              className="rc-link-btn ux-profile__more"
              aria-expanded={open}
              aria-controls="ux-profile-desc"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Show less' : 'Read full profile'}
            </button>
          </>
        ) : (
          <p className="ux-profile__desc ux-muted">No company description is on file.</p>
        )}
      </div>
      {facts.length ? (
        <dl className="ux-profile__facts">
          {facts.map((f) => (
            <div key={f.label} className="ux-profile__fact">
              <dt>
                <i className={`bi ${f.icon}`} aria-hidden="true" /> {f.label}
              </dt>
              <dd>
                {f.href ? (
                  <a href={f.href} target="_blank" rel="noopener noreferrer">
                    {f.value} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    <span className="rc-sr"> (opens in a new tab)</span>
                  </a>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export default CompanyProfileBand;
