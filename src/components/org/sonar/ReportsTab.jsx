'use client';

/**
 * Reports: what needs the viewer (reports awaiting their review, reports
 * returned to them, their drafts), then every report they can read with
 * search and filters kept in the page address, then the research attached
 * to pitches. Beside it: the fund budget, stale coverage and research
 * quality.
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Empty, Section, SectionError, TextToggle } from '@/components/org/command-center/parts';
import {
  KIND_LABEL,
  NA,
  REPORT_KINDS,
  REPORT_STATUSES,
  REPORT_VISIBILITY,
  STATUS_LABEL,
  VISIBILITY_LABEL,
  VISIBILITY_SHORT,
  challengeCounts,
  claimsOf,
  fmtDate,
  fmtVersion,
  hasFilters,
  isReviewer,
  needsYou,
  pitchAttachments,
} from '@/lib/org-sonar-research-model';
import {
  KindText,
  MandateText,
  StatusText,
  TableSkeleton,
  TextSelect,
  VisibilityText,
} from './parts';
import { BudgetSection, CoverageSection, QualitySection } from './SidePanels';

const hrefOf = (r) => `/org-team-hub/sonar/${encodeURIComponent(r.id)}`;

function ReportCell({ r, sub = true, challenged = 0, version = false }) {
  return (
    <td role="rowheader" className="osp-reportcell">
      <Link href={hrefOf(r)} className="osp-open" onClick={(e) => e.stopPropagation()}>
        <span className="osp-title">{r.title}</span>
        {sub ? (
          <span className="osp-sub">
            <KindText kind={r.kind} plain />
            {version ? <span className="tcc-mono">{fmtVersion(r.current_version)}</span> : null}
            {r.kind === 'fund_fit' ? <MandateText summary={r.summary} /> : null}
            {challenged ? (
              <span>
                Challenged <span className="tcc-mono">{challenged}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </Link>
    </td>
  );
}

const TickerCell = ({ r }) => (
  <td className={r.ticker ? 'tcc-mono tcc-ticker' : 'tcc-na'}>{r.ticker || NA}</td>
);

function Rows({ rows, columns, router }) {
  return (
    <div className="osp-scroll">
      <table className="osp-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.id} scope="col" className={c.num ? 'osp-num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => router.push(hrefOf(r))}>
              {columns.map((c) => (
                <c.Cell key={c.id} r={r} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const COL = {
  report: { id: 'report', label: 'Report', Cell: ReportCell },
  ticker: { id: 'ticker', label: 'Ticker', Cell: TickerCell },
  author: {
    id: 'author',
    label: 'Author',
    Cell: ({ r }) => <td className="osp-wrap">{r.author_name || NA}</td>,
  },
  version: {
    id: 'version',
    label: 'Version',
    num: true,
    Cell: ({ r }) => <td className="osp-num tcc-mono">{fmtVersion(r.current_version)}</td>,
  },
  claims: {
    id: 'claims',
    label: 'Claims verified',
    num: true,
    Cell: ({ r }) => {
      const v = claimsOf(r.summary);
      return <td className={`osp-num tcc-mono${v === NA ? ' tcc-na' : ''}`}>{v}</td>;
    },
  },
  updated: {
    id: 'updated',
    label: 'Updated',
    num: true,
    Cell: ({ r }) => <td className="osp-num tcc-mono">{fmtDate(r.updated_at)}</td>,
  },
  status: {
    id: 'status',
    label: 'Status',
    Cell: ({ r }) => (
      <td>
        <StatusText status={r.status} />
      </td>
    ),
  },
  visibility: {
    id: 'visibility',
    label: 'Visible to',
    Cell: ({ r }) => (
      <td>
        <VisibilityText visibility={r.visibility} label={VISIBILITY_SHORT[r.visibility]} />
      </td>
    ),
  },
  note: {
    id: 'note',
    label: 'Review note',
    Cell: ({ r }) => (
      <td className={`osp-note${r.review_note ? '' : ' tcc-na'}`}>
        {r.review_note || 'No note'}
        <span className="osp-sub">{r.reviewer_name ? `From ${r.reviewer_name}` : ''}</span>
      </td>
    ),
  },
};

export function ReportsTab({ data, filters, setFilters, onTab, onSettings, viewer }) {
  const router = useRouter();
  const base = data.reports;
  const arch = data.archive;
  const rows = useMemo(() => base.data?.reports || [], [base.data]);
  const archive = useMemo(() => arch.data?.reports || [], [arch.data]);
  const pitches = useMemo(() => data.pitches.data?.pitches || [], [data.pitches.data]);
  const n = useMemo(() => needsYou(rows, viewer), [rows, viewer]);
  const challenges = useMemo(() => challengeCounts(rows), [rows]);
  const attached = useMemo(() => pitchAttachments(rows, pitches), [rows, pitches]);
  const loading = base.status === 'loading';
  const failed = base.status === 'error' || base.status === 'missing';
  const archLoading = arch.status === 'loading';
  const archFailed = arch.status === 'error' || arch.status === 'missing';
  const filtered = hasFilters(filters);
  const reviewer = isReviewer(viewer);
  const tickers = useMemo(
    () => [...new Set(rows.map((r) => r.ticker).filter(Boolean))].sort(),
    [rows],
  );
  const setF = (patch) => setFilters({ ...filters, ...patch });

  const archiveCols = [
    {
      ...COL.report,
      Cell: ({ r }) => <ReportCell r={r} version challenged={challenges.get(r.id) || 0} />,
    },
    COL.ticker,
    COL.status,
    COL.visibility,
    COL.author,
    COL.claims,
    COL.updated,
  ];

  const nothing = !n.review.length && !n.returned.length && !n.drafts.length;

  return (
    <div className="osp-body">
      <div className="osp-main">
        <Section
          id="osp-needs"
          title="Needs you"
          aside={
            !loading && !failed ? (
              <span className="osp-aside tcc-mono">
                {n.review.length + n.returned.length + n.drafts.length}
              </span>
            ) : null
          }
        >
          {loading ? (
            <TableSkeleton rows={5} />
          ) : failed ? (
            <SectionError message="Could not load reports." onRetry={data.retry.reports} />
          ) : nothing ? (
            <Empty action="Start research" onAction={() => onTab('research')}>
              Nothing needs you right now.
            </Empty>
          ) : (
            <>
              {reviewer ? (
                <div className="osp-sub-section">
                  <h3 className="osp-h3">
                    Awaiting your review{' '}
                    <span className="tcc-mono osp-count">{n.review.length}</span>
                  </h3>
                  {n.review.length ? (
                    <Rows
                      rows={n.review}
                      router={router}
                      columns={[
                        COL.report,
                        COL.ticker,
                        COL.author,
                        COL.version,
                        COL.claims,
                        {
                          id: 'pitch',
                          label: 'Pitch',
                          Cell: ({ r }) => {
                            const p = pitches.find((x) => x.id === r.pitch_id);
                            return p ? (
                              <td>
                                <span className="osp-word tcc-mono">
                                  <i className="bi bi-link-45deg" aria-hidden="true" />
                                  {p.ticker}
                                </span>
                              </td>
                            ) : (
                              <td className="tcc-na">{NA}</td>
                            );
                          },
                        },
                        {
                          ...COL.updated,
                          label: 'Submitted',
                          Cell: ({ r }) => (
                            <td className="osp-num tcc-mono">
                              {fmtDate(r.submitted_at || r.updated_at)}
                            </td>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <Empty>No reports are waiting for your review.</Empty>
                  )}
                </div>
              ) : null}
              {n.returned.length ? (
                <div className="osp-sub-section">
                  <h3 className="osp-h3">
                    Returned to you <span className="tcc-mono osp-count">{n.returned.length}</span>
                  </h3>
                  <p className="osp-hint">
                    A report cannot be edited. Open it, run the research again and save the run as a
                    new version of the report.
                  </p>
                  <Rows
                    rows={n.returned}
                    router={router}
                    columns={[COL.report, COL.ticker, COL.note, COL.version, COL.updated]}
                  />
                </div>
              ) : null}
              <div className="osp-sub-section">
                <h3 className="osp-h3">
                  Your drafts <span className="tcc-mono osp-count">{n.drafts.length}</span>
                </h3>
                {n.drafts.length ? (
                  <Rows
                    rows={n.drafts}
                    router={router}
                    columns={[
                      COL.report,
                      COL.ticker,
                      COL.visibility,
                      COL.version,
                      COL.claims,
                      COL.updated,
                    ]}
                  />
                ) : (
                  <Empty action="Start research" onAction={() => onTab('research')}>
                    No drafts.
                  </Empty>
                )}
              </div>
            </>
          )}
        </Section>

        <Section
          id="osp-archive"
          title="All reports"
          className="osp-gap"
          aside={
            !archLoading && !archFailed ? (
              <span className="osp-aside tcc-mono">{archive.length}</span>
            ) : null
          }
        >
          <div className="osp-filters">
            <label className="osp-search">
              <i className="bi bi-search" aria-hidden="true" />
              <span className="tcc-sr">Search reports</span>
              <input
                type="search"
                value={filters.q}
                onChange={(e) => setF({ q: e.target.value })}
                placeholder="Search titles, questions, tickers, authors"
              />
            </label>
            <div className="osp-filtermenus">
              <TextSelect
                label="Status"
                value={filters.status}
                onChange={(v) => setF({ status: v })}
                options={REPORT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              />
              <TextSelect
                label="Kind"
                value={filters.kind}
                onChange={(v) => setF({ kind: v })}
                options={REPORT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
              />
              <TextSelect
                label="Visible to"
                value={filters.visibility}
                onChange={(v) => setF({ visibility: v })}
                options={REPORT_VISIBILITY.map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
              />
              <TextSelect
                label="Ticker"
                value={filters.ticker}
                onChange={(v) => setF({ ticker: v })}
                options={[
                  ...new Set([...tickers, ...(filters.ticker ? [filters.ticker] : [])]),
                ].map((t) => ({ value: t, label: t }))}
              />
              <TextToggle pressed={filters.mine} onClick={() => setF({ mine: !filters.mine })}>
                Mine
              </TextToggle>
              {filtered ? (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() =>
                    setFilters({
                      q: '',
                      status: '',
                      kind: '',
                      visibility: '',
                      ticker: '',
                      mine: false,
                    })
                  }
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
          {archLoading ? (
            <TableSkeleton rows={6} />
          ) : archFailed ? (
            <SectionError message="Could not load reports." onRetry={data.retry.reports} />
          ) : !rows.length && !filtered ? (
            <Empty action="Start research" onAction={() => onTab('research')}>
              No reports yet. Run research and choose Save to your fund.
            </Empty>
          ) : !archive.length ? (
            <Empty
              action="Clear filters"
              onAction={() =>
                setFilters({ q: '', status: '', kind: '', visibility: '', ticker: '', mine: false })
              }
            >
              No reports match these filters.
            </Empty>
          ) : (
            <>
              <Rows rows={archive} router={router} columns={archiveCols} />
              {archive.length >= 200 ? (
                <p className="osp-hint">
                  Showing the newest 200 matches. Narrow the filters to reach older reports.
                </p>
              ) : null}
            </>
          )}
        </Section>

        <Section
          id="osp-pitches"
          title="Research on pitches"
          className="osp-gap"
          aside={
            <Link href="/org-team-hub/pitches" className="tcc-link">
              Pitch pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          }
        >
          {loading ? (
            <TableSkeleton rows={3} />
          ) : failed ? (
            <SectionError message="Could not load reports." onRetry={data.retry.reports} />
          ) : !attached.length ? (
            <Empty>No report is attached to a pitch yet. Choose a pitch when you save a run.</Empty>
          ) : (
            <div className="osp-scroll">
              <table className="osp-table">
                <thead>
                  <tr>
                    <th scope="col">Pitch</th>
                    <th scope="col">Report</th>
                    <th scope="col">Status</th>
                    <th scope="col">Author</th>
                    <th scope="col" className="osp-num">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attached.map(({ report: r, pitch: p }) => (
                    <tr key={r.id} onClick={() => router.push(hrefOf(r))}>
                      <td>
                        {p ? (
                          <Link
                            href={`/org-team-hub/pitches?pitch=${encodeURIComponent(p.id)}`}
                            className="osp-word osp-pitchlink"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="bi bi-link-45deg" aria-hidden="true" />
                            <span className="tcc-mono">{p.ticker || NA}</span>
                          </Link>
                        ) : (
                          <span className="tcc-na">{NA}</span>
                        )}
                      </td>
                      <ReportCell r={r} sub={false} />
                      <td>
                        <StatusText status={r.status} />
                      </td>
                      <td className="osp-wrap">{r.author_name || NA}</td>
                      <td className="osp-num tcc-mono">{fmtDate(r.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
      <span className="tcc-vrule osp-vrule" aria-hidden="true" />
      <aside className="osp-side" aria-label="Budget, coverage and quality">
        <BudgetSection state={data.budget} onRetry={data.retry.budget} onSettings={onSettings} />
        <CoverageSection
          state={data.analytics}
          onRetry={data.retry.analytics}
          onTicker={(t) => setFilters({ ...filters, ticker: t })}
        />
        <QualitySection
          state={data.analytics}
          onRetry={data.retry.analytics}
          onOpenAnalytics={() => onTab('analytics')}
        />
      </aside>
    </div>
  );
}
