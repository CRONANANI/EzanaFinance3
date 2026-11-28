/**
 * Sonar for organizations: run one council capability on the context the provider loaded
 * (Nov 28 2026). Deterministic: no model call, no write. Returns the same answer shape the
 * standard Sonar shell draws (a Desk Summary, visualizations for the component registry,
 * evidence references and limitations) so a council answer looks like every other Sonar
 * answer, plus the proposed actions a member may confirm.
 *
 *   runOrgCapability(intent, ctx, { now, staleDays }) -> {
 *     capability, operation, desk: { headline, paragraphs, qualification, label },
 *     visuals: [analysis visualizations with council types], evidence: [{ id, kind, label }],
 *     limitations: [{ measure, reason }], proposals: [{ action, label, detail }],
 *     context: { indicators }, hypothetical: boolean }
 *
 * Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 */
import {
  concentration,
  policyObservations,
  limitationsFor,
  pricingCoverage,
  HYPOTHETICAL_LABEL,
} from './portfolio';
import { coverageMap } from './coverage';
import { thesisCompleteness, committeeQuestions, decisionPreparation } from './red-team';
import { meetingBriefing, versionComparison } from './briefing';
import { formatFigure } from '@/lib/sonar/presentation/contracts';

const pct = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : 'N/A');
const usd = (v) => formatFigure(v, 'usd', { compact: true });
const evidenceOf = (kind, rows, label) =>
  rows.filter((r) => r && r.id).map((r) => ({ id: `${kind}:${r.id}`, kind, label: label(r) }));

function exposureVisual(c, retrievedAt) {
  return {
    id: 'council_sectors',
    type: 'org_exposure',
    title: 'Council sector exposure',
    metric: 'Weight of fund value',
    unit: 'percent',
    period: { label: 'Current book' },
    source: 'Council position book',
    evidenceIds: ['org_positions'],
    dataset: { id: 'org_positions', label: 'Council positions' },
    retrievedAt,
    limitations: c.coverage.note ? [c.coverage.note] : [],
    data: {
      parts: c.sectors.map((s) => ({
        key: s.sector,
        label: s.sector,
        value: Number(s.pct.toFixed(4)),
      })),
      exclusive: true,
      total: 100,
      denominatorLabel: `${usd(c.totalValue)} fund value`,
    },
  };
}

function positionsTable(c, retrievedAt) {
  return {
    id: 'council_positions',
    type: 'table',
    title: 'Largest council positions',
    source: 'Council position book',
    evidenceIds: ['org_positions'],
    retrievedAt,
    period: { label: 'Current book' },
    columns: [
      { key: 'ticker', label: 'Ticker', type: 'ticker' },
      { key: 'sector', label: 'Sector', type: 'text' },
      { key: 'value', label: 'Value', type: 'money' },
      { key: 'weightPct', label: 'Weight', type: 'percent' },
      { key: 'unrealizedPl', label: 'Unrealized P&L', type: 'money' },
      { key: 'pricing', label: 'Valuation', type: 'text' },
    ],
    rows: c.rows.map((r) => ({
      id: r.ticker,
      ...r,
      pricing: r.priced ? 'Stored price' : 'At cost',
    })),
  };
}

function checklist(id, type, title, sections, extra = {}) {
  return {
    id,
    type,
    title,
    source: 'Council records',
    evidenceIds: extra.evidenceIds || ['org_records'],
    period: extra.period || null,
    data: { sections },
    ...extra,
  };
}

export function runOrgCapability(intent, ctx = {}, { now = Date.now(), staleDays } = {}) {
  const book = ctx.positions || [];
  const retrievedAt = new Date(now).toISOString();
  const limitations = limitationsFor(intent.unsupported || []);
  const out = {
    capability: intent.capability,
    operation: intent.operation,
    desk: null,
    visuals: [],
    evidence: [],
    limitations,
    proposals: [],
    hypothetical: false,
    context: { indicators: ctx.indicators || [] },
  };

  switch (intent.capability) {
    case 'org-portfolio-analysis': {
      const c = concentration(book);
      if (c.empty) {
        out.desk = {
          headline: 'The council fund holds no active positions',
          paragraphs: [
            'There is nothing to measure until positions are recorded in the council book.',
          ],
        };
        break;
      }
      out.visuals.push(positionsTable(c, retrievedAt), exposureVisual(c, retrievedAt));
      out.evidence.push({
        id: 'org_positions',
        kind: 'positions',
        label: `Council position book, ${c.positionCount} active positions`,
      });
      const topSector = c.sectors[0];
      const flags = (ctx.flags || []).filter(
        (f) => !['resolved', 'closed', 'dismissed'].includes(f.status),
      );
      if (intent.operation === 'flags')
        out.visuals.push(
          checklist('council_flags', 'org_policy', 'Active position flags', [
            {
              key: 'flags',
              label: 'Open flags',
              items: flags.map((f) => ({
                text: `${f.ticker}: ${f.subject || 'Flag'}`,
                status: f.flag_color || 'open',
                ref: { kind: 'flag', id: f.id },
              })),
            },
          ]),
        );
      out.desk = {
        headline:
          intent.operation === 'sector_exposure'
            ? `${topSector?.sector || 'The largest sector'} is ${pct(topSector?.pct)} of the council fund`
            : intent.operation === 'flags'
              ? `${flags.length} position flag${flags.length === 1 ? ' is' : 's are'} open`
              : `${c.largest.ticker} is the largest position at ${pct(c.largest.weightPct)} of the fund`,
        paragraphs: [
          `The five largest positions are ${pct(c.topFiveSharePct)} of ${usd(c.totalValue)} across ${c.positionCount} positions. The largest sector is ${topSector?.sector || 'unclassified'} at ${pct(topSector?.pct)}.`,
        ],
        qualification: c.coverage.note,
      };
      break;
    }
    case 'org-policy-observations': {
      const sc =
        intent.scenario && intent.scenario.ticker
          ? { ...intent.scenario, sector: ctx.scenarioSector || null }
          : null;
      const pol = policyObservations({
        rules: ctx.ips || [],
        book,
        scenario: sc,
        marketCap: ctx.scenarioMarketCap ?? null,
      });
      out.hypothetical = Boolean(sc);
      out.visuals.push(
        checklist(
          'council_policy',
          'org_policy',
          sc
            ? `Recorded rules, ${HYPOTHETICAL_LABEL.replace(/\.$/, '').toLowerCase()}`
            : 'Recorded rule comparison',
          [
            {
              key: 'rules',
              label: sc ? `Current book and the scenario (${HYPOTHETICAL_LABEL})` : 'Current book',
              items: pol.observations.map((o) => ({
                text: o.label,
                status: o.concern ? 'concern' : o.current.status === 'none' ? 'info' : 'ok',
                detail: o.scenario
                  ? `Now: ${o.current.detail} Scenario: ${o.scenario.detail}`
                  : o.current.detail,
                motive: { kind: 'policy', text: o.wording },
              })),
            },
          ],
          {
            evidenceIds: ['org_ips_rules', 'org_positions'],
            flags: sc ? { estimate: true } : null,
          },
        ),
      );
      if (pol.scenario && pol.scenario.ok === false)
        out.limitations.push({
          measure: 'scenario',
          reason: pol.scenario.reason || `Missing input: ${pol.scenario.missing.join(', ')}.`,
        });
      out.evidence.push({
        id: 'org_ips_rules',
        kind: 'ips',
        label: `${pol.rules} active recorded IPS rules`,
      });
      out.desk = {
        headline: !pol.rules
          ? 'The council has no active recorded investment policy rules'
          : pol.concerns
            ? `${pol.concerns} potential policy concern${pol.concerns > 1 ? 's' : ''} for review`
            : 'No potential policy concerns against recorded rules',
        paragraphs: [
          pol.scenario?.ok
            ? `${HYPOTHETICAL_LABEL} ${pol.scenario.ticker} would move from ${pct(pol.scenario.positionPctBefore)} to ${pct(pol.scenario.positionPctAfter)} of the fund, and ${pol.scenario.sector} from ${pct(pol.scenario.sectorPctBefore)} to ${pct(pol.scenario.sectorPctAfter)}.`
            : pol.note || '',
        ].filter(Boolean),
        qualification:
          'Advisory comparison against recorded rules. Nothing is blocked or executed; the committee decides.',
        label: out.hypothetical ? 'Hypothetical' : null,
      };
      break;
    }
    case 'org-research-coverage': {
      const cov = coverageMap({
        book,
        reports: ctx.reports,
        notes: ctx.notes,
        pitches: ctx.pitches,
        coverage: ctx.coverage,
        members: ctx.members,
        assignments: ctx.assignments,
        now,
        staleDays,
      });
      out.visuals.push({
        id: 'council_coverage',
        type: 'org_coverage',
        title: 'Research coverage of council holdings',
        source: 'Council research records',
        evidenceIds: ['org_sonar_reports', 'org_research_notes', 'org_sector_coverage'],
        retrievedAt,
        data: {
          columns: [
            { key: 'ticker', label: 'Ticker', type: 'ticker' },
            { key: 'owner', label: 'Covered by', type: 'text' },
            { key: 'latestTitle', label: 'Latest research', type: 'text' },
            { key: 'ageDays', label: 'Age (days)', type: 'number' },
            { key: 'openAssignments', label: 'Open assignments', type: 'number' },
            { key: 'pendingReview', label: 'In review', type: 'number' },
            { key: 'statusLabel', label: 'Status', type: 'text' },
          ],
          rows: cov.rows.map((r) => ({
            id: r.ticker,
            ...r,
            owner: r.owner,
            latestTitle: r.latest?.title || null,
            statusLabel:
              r.status === 'no_research'
                ? 'No research on record'
                : r.status === 'stale'
                  ? `Older than ${cov.staleDays} days`
                  : 'Current',
          })),
        },
      });
      out.desk = {
        headline: cov.gaps
          ? `${cov.gaps} of ${cov.rows.length} holdings have no research newer than ${cov.staleDays} days`
          : `Every holding has research newer than ${cov.staleDays} days`,
        paragraphs: [
          cov.noOwner
            ? `${cov.noOwner} holding${cov.noOwner > 1 ? 's have' : ' has'} no recorded coverage owner.`
            : 'Every holding has a recorded coverage owner.',
        ],
        qualification: cov.note,
      };
      out.proposals = cov.rows
        .filter((r) => r.status !== 'current')
        .slice(0, 5)
        .map((r) => ({
          action: 'propose_assignment',
          label: `Propose a research update for ${r.ticker}`,
          detail: r.owner ? `Suggested for ${r.owner}` : 'No recorded owner',
        }));
      break;
    }
    case 'org-thesis-red-team':
    case 'org-pitch-research': {
      const pitch = ctx.pitch;
      if (!pitch) {
        out.desk = {
          headline: 'Choose a pitch to work on',
          paragraphs: [
            'The red team and the thesis checklist read a recorded pitch and its linked research. No pitch was selected or readable.',
          ],
        };
        break;
      }
      const report = ctx.pitchReport || null;
      const pol = policyObservations({ rules: ctx.ips || [], book });
      const done = thesisCompleteness(pitch, report);
      const qs = committeeQuestions(pitch, report, { policy: pol });
      const prep = decisionPreparation(pitch, report);
      out.visuals.push(
        checklist(
          'thesis_checklist',
          'org_completeness',
          `${pitch.ticker} thesis checklist`,
          [
            {
              key: 'criteria',
              label: `${done.met} met, ${done.partial} partial, ${done.missing.length} missing`,
              items: done.rows.map((r) => ({ text: r.label, status: r.status, detail: r.field })),
            },
          ],
          { evidenceIds: [`pitch:${pitch.id}`] },
        ),
      );
      if (intent.capability === 'org-thesis-red-team')
        out.visuals.push(
          checklist(
            'ic_questions',
            'org_questions',
            'Questions for the committee',
            qs.groups.map((g) => ({
              key: g.id,
              label: g.label,
              items: g.questions.map((q) => ({ text: q.question, motive: q.motive })),
            })),
            { evidenceIds: [`pitch:${pitch.id}`] },
          ),
        );
      out.visuals.push(
        checklist(
          'decision_prep',
          'org_thesis',
          'Bull, base and bear as recorded',
          [
            {
              key: 'cases',
              label: 'Cases',
              items: [
                ['Bull', prep.bull],
                ['Base', prep.base],
                ['Bear', prep.bear],
              ].map(([k, v]) => ({
                text: k,
                detail: v || 'Not recorded',
                status: v ? 'ok' : 'missing',
              })),
            },
            {
              key: 'valuation',
              label: 'Valuation',
              items: [
                {
                  text: prep.valuation.method || 'Method not recorded',
                  detail:
                    prep.valuation.targetPrice != null
                      ? `Target ${prep.valuation.targetPrice}`
                      : 'No target recorded',
                  status: prep.valuation.method ? 'ok' : 'missing',
                },
              ],
            },
          ],
          { evidenceIds: [`pitch:${pitch.id}`] },
        ),
      );
      out.evidence.push(
        { id: `pitch:${pitch.id}`, kind: 'pitch', label: `${pitch.ticker} pitch` },
        ...(report
          ? [{ id: `report:${report.id}`, kind: 'report', label: report.title || 'Linked report' }]
          : []),
      );
      out.desk = {
        headline:
          intent.capability === 'org-thesis-red-team'
            ? `${qs.count} committee questions for the ${pitch.ticker} pitch`
            : `${pitch.ticker} thesis: ${done.missing.length} sections still missing`,
        paragraphs: [
          done.missing.length
            ? `Missing: ${done.missing.join(', ')}.`
            : 'Every checklist section has something recorded.',
        ],
        qualification:
          'Sonar prepares the discussion. It does not approve, reject, vote or move the pitch.',
      };
      out.proposals = done.rows
        .filter((r) => r.status !== 'met')
        .slice(0, 4)
        .map((r) => ({
          action: 'propose_thesis_section',
          label: `Draft the ${r.label.toLowerCase()} section`,
          detail: r.field,
        }));
      break;
    }
    case 'org-meeting-briefing': {
      const pol = policyObservations({ rules: ctx.ips || [], book });
      const b = meetingBriefing({
        meeting: ctx.meeting,
        meetings: ctx.meetings,
        pitches: ctx.pitches,
        reports: ctx.reports,
        flags: ctx.flags,
        policy: pol,
      });
      if (!b.ok) {
        out.desk = { headline: 'No upcoming meeting is recorded', paragraphs: [b.reason] };
        break;
      }
      out.visuals.push(
        checklist(
          'meeting_brief',
          'org_briefing',
          `Briefing: ${b.meeting.title}`,
          b.sections.map((s) => ({ ...s, items: s.items.length ? s.items : [] })),
          {
            evidenceIds: [`meeting:${b.meeting.id}`],
            period: b.meeting.scheduledAt
              ? { label: String(b.meeting.scheduledAt).slice(0, 10) }
              : null,
          },
        ),
      );
      out.evidence.push({ id: `meeting:${b.meeting.id}`, kind: 'meeting', label: b.meeting.title });
      const n = (k) => b.sections.find((s) => s.key === k)?.items.length || 0;
      out.desk = {
        headline: `${b.meeting.title}: ${n('pitches')} pitch${n('pitches') === 1 ? '' : 'es'}, ${n('review')} report${n('review') === 1 ? '' : 's'} awaiting review`,
        paragraphs: [
          `${n('research')} approved report${n('research') === 1 ? '' : 's'} ${b.previous ? 'since the previous meeting' : 'before this meeting'}, ${n('flags')} open flag${n('flags') === 1 ? '' : 's'}.`,
        ],
        qualification: b.note,
      };
      break;
    }
    case 'org-research-memory': {
      const cmp = versionComparison({
        original: ctx.originalVersion,
        current: ctx.currentEvidence,
        monitors: ctx.monitorResults || [],
      });
      if (!cmp.ok) {
        out.desk = {
          headline: 'No earlier council research on this subject',
          paragraphs: [cmp.reason],
        };
        break;
      }
      out.visuals.push({
        id: 'version_cmp',
        type: 'org_versions',
        title: 'Then and now',
        source: 'Council research versions',
        evidenceIds: [`report:${cmp.original.reportId}`],
        data: cmp,
      });
      out.desk = {
        headline: `Version ${cmp.original.version} (${String(cmp.original.date || '').slice(0, 10)}) against current evidence`,
        paragraphs: [
          `${cmp.confirmed} assumptions confirmed, ${cmp.contradicted} contradicted and ${cmp.untested} untested by recorded monitors. ${cmp.newFindings.length} new findings since.`,
        ],
        qualification: cmp.note,
      };
      break;
    }
    default:
      out.desk = { headline: 'This council capability is not available yet', paragraphs: [] };
  }

  if (
    book.length &&
    !out.evidence.some((e) => e.kind === 'positions') &&
    intent.capability !== 'org-research-memory'
  )
    out.evidence.push({
      id: 'org_positions',
      kind: 'positions',
      label: `Council position book (${pricingCoverage(book).priced} of ${book.length} priced)`,
    });
  out.evidence.push(
    ...evidenceOf('report', ctx.citedReports || [], (r) => r.title || 'Council report'),
  );
  return out;
}
