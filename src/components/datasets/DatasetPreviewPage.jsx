'use client';

import HubQueryLink from '@/components/datasets/HubQueryLink';
import {
  DatasetIdentity,
  DatasetNotConnected,
  DatasetSampleGate,
} from '@/components/datasets/DatasetSampleGate';
import { PREVIEW_SAMPLES } from '@/lib/datasets/preview-samples';
import './dataset-preview.css';

/**
 * A dataset page whose data source is not connected yet. Admin and demo
 * accounts see the page laid out with invented, labelled sample rows so it can
 * be reviewed and demonstrated; everyone else sees the honest empty state.
 * Nothing here is a real record, and nothing on it is saved.
 */
export default function DatasetPreviewPage({ slug }) {
  const cfg = PREVIEW_SAMPLES[slug];
  if (!cfg) return null;
  return (
    <DatasetSampleGate
      isSample
      fallback={<DatasetNotConnected name={cfg.name} dimension={cfg.dimension} />}
    >
      <div className="dsp-page">
        <DatasetIdentity name={cfg.name} dimension={cfg.dimension} sample />
        {cfg.dimensionId ? <HubQueryLink dimension={cfg.dimensionId} /> : null}
        {cfg.sections.map((s) => (
          <section key={s.id} className="dsp-section" aria-labelledby={`dsp-${s.id}`}>
            <div className="dsp-section-head">
              <h2 id={`dsp-${s.id}`} className="dsp-section-title">
                {s.title}
              </h2>
              <span className="dsp-section-note">Sample content</span>
            </div>
            <div className="dsp-table-scroll">
              <table className="dsp-table">
                <thead>
                  <tr>
                    {s.columns.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        style={c.align === 'right' ? { textAlign: 'right' } : undefined}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r, i) => (
                    <tr key={r.id || i}>
                      {s.columns.map((c) => (
                        <td
                          key={c.key}
                          className={
                            [
                              c.align === 'right' ? 'dsp-num' : '',
                              c.mono ? 'dsp-mono' : '',
                              c.strong ? 'dsp-strong' : '',
                            ]
                              .filter(Boolean)
                              .join(' ') || undefined
                          }
                        >
                          {r[c.key] ?? 'N/A'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <p className="dsp-foot">
          {cfg.sourceLine} Every name, figure and ticker on this page is invented sample content,
          shown to admin and demo accounts only. Nothing here is investment advice.
        </p>
      </div>
    </DatasetSampleGate>
  );
}
