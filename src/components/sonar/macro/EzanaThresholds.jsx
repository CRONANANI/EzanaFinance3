'use client';

/**
 * "Ezana thresholds" explainer (Nov 2026).
 *
 * <EzanaThresholdsButton> renders the words "Ezana thresholds" as an inline text button inside
 * a sentence; it opens a modal that shows how the currency-pressure assessment is built:
 * the five components, what each measures, the cut-offs for low / moderate / elevated /
 * severe, how the overall label is set, the crisis row, and what the assessment is not.
 *
 * Every cut-off comes from CURRENCY_THRESHOLDS through currencyThresholdRows(), the same
 * numbers assessCurrencyPressure uses, so the explainer cannot drift from the engine. When the
 * card passes its assessment rows, a last column shows where this country sits now (its level
 * and the measured reading) and the matching cut-off is marked.
 *
 * ds Modal (portal to <body>, Escape and overlay close, focus moved in and restored). The table
 * becomes one card per component in a narrow modal. Styles: ezana-thresholds.css, scoped ezt-.
 */

import { useCallback, useState } from 'react';
import { Modal, Table, THead, TBody, TR, TH, TD, VisuallyHidden, Badge } from '@/components/ds';
import {
  currencyThresholdRows,
  OVERALL_RULE,
  CRISIS_RULE,
  THRESHOLD_CAVEATS,
  CURRENCY_LEVELS,
} from '@/lib/sonar/macro/currency-thresholds';
import { evidenceReading, sentenceCase } from '@/lib/sonar/country-intel-view';
import './ezana-thresholds.css';

const TONE = { low: 'positive', moderate: 'info', elevated: 'warning', severe: 'negative' };

export function EzanaThresholdsModal({ open, onClose, rows = [], place = '' }) {
  const ladder = currencyThresholdRows();
  const byId = new Map((rows || []).filter((r) => r && r.id).map((r) => [r.id, r]));
  const hasNow = ladder.some((l) => byId.has(l.id));
  const nowHead = place ? `${place} now` : 'This answer';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How Ezana thresholds work"
      size="1040px"
      className="ezt-modal"
    >
      <div className="ezt">
        <p className="ezt-p">
          Sonar reads currency pressure on five components. Each one is placed on a four-step scale,
          low, moderate, elevated or severe, using fixed cut-offs that are written down in advance
          and are the same for every country. The overall label then follows one rule. The numbers
          below are the ones the engine uses.
        </p>

        <div className="ezt-scroll" role="region" aria-label="Cut-offs by component" tabIndex={0}>
          <Table className="ezt-table">
            <VisuallyHidden as="caption">
              Ezana thresholds: each component, what it measures, and the cut-off for each level
              {hasNow ? `, with ${nowHead.toLowerCase()}` : ''}
            </VisuallyHidden>
            <THead>
              <TR>
                <TH scope="col">Component</TH>
                {CURRENCY_LEVELS.map((lv) => (
                  <TH key={lv} scope="col">
                    {sentenceCase(lv)}
                  </TH>
                ))}
                {hasNow ? <TH scope="col">{nowHead}</TH> : null}
              </TR>
            </THead>
            <TBody>
              {ladder.map((l) => {
                const now = byId.get(l.id);
                const reading = now ? evidenceReading(now) : null;
                return (
                  <TR key={l.id}>
                    <TH scope="row" className="ezt-rowh">
                      <span className="ezt-comp">{l.label}</span>
                      <span className="ezt-measure">{l.measure}</span>
                      {l.note ? <span className="ezt-note">{l.note}</span> : null}
                    </TH>
                    {CURRENCY_LEVELS.map((lv) => {
                      const on = now?.level === lv;
                      return (
                        <TD
                          key={lv}
                          data-label={sentenceCase(lv)}
                          className={`ezt-cell is-${lv}${on ? ' is-current' : ''}`}
                        >
                          {l.levels[lv]}
                          {on ? <VisuallyHidden> (current level)</VisuallyHidden> : null}
                        </TD>
                      );
                    })}
                    {hasNow ? (
                      <TD data-label={nowHead} className="ezt-now">
                        {now ? (
                          <span className="ezt-now-body">
                            <Badge tone={TONE[now.level] || 'neutral'} className="ezt-badge">
                              {sentenceCase(now.level)}
                            </Badge>
                            {reading ? <span className="ezt-reading">{reading}</span> : null}
                          </span>
                        ) : (
                          <span className="ezt-reading">Not assessed: data not available</span>
                        )}
                      </TD>
                    ) : null}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>

        <div className="ezt-cols">
          <section className="ezt-sec" aria-labelledby="ezt-overall-h">
            <h3 id="ezt-overall-h" className="ezt-h">
              How the overall label is set
            </h3>
            <ol className="ezt-ol">
              {OVERALL_RULE.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <p className="ezt-p ezt-muted">{CRISIS_RULE}</p>
          </section>

          <section className="ezt-sec" aria-labelledby="ezt-not-h">
            <h3 id="ezt-not-h" className="ezt-h">
              What this is not
            </h3>
            <ul className="ezt-ul">
              {THRESHOLD_CAVEATS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The inline trigger. `children` defaults to "Ezana thresholds"; it sits inside a sentence,
 * so it is a text button (not a link: it opens a dialog, it does not navigate).
 */
export function EzanaThresholdsButton({ rows, place, className = '', children }) {
  const [open, setOpen] = useState(false);
  /* ds Modal returns focus to this button when it closes. */
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className={`ezt-trigger ${className}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {children || 'Ezana thresholds'}
      </button>
      <EzanaThresholdsModal open={open} onClose={close} rows={rows} place={place} />
    </>
  );
}

export default EzanaThresholdsButton;
