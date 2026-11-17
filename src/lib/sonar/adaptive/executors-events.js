/**
 * Sonar adaptive research: executors for corporate events (Nov 2026).
 *
 *   A03 leadership impact   what a leadership change means for a company and its industry.
 *                           One validated live research call, the measured price reaction
 *                           since the event, the news cache and a price comparison.
 *   A05 move attribution    why a security is moving. The move is measured from daily bars
 *                           first (size, ordinary range, benchmark share, volume); dated
 *                           reporting is then set beside it. Measurement needs no model, so
 *                           this answer still stands when the research call does not finish.
 *
 * Both keep fact and reading apart: a number is computed, a reported item carries its
 * source, and anything else is labelled interpretation.
 */
import { benchmarkFor } from '@/lib/sonar/market-context';
import { sourceClass, hostOf, canonicalUrl } from './news-intelligence';
import { researchLeadershipImpact, researchMoveCatalysts } from './event-research';
import { attributeMove, sinceEvent, moveWindowOf, assumedDirection } from './move-attribution';
import { EVENT_STATUSES } from './schema';
import {
  day,
  usd,
  pct,
  isoDaysAgo,
  ADJUSTMENT,
  step,
  sourceBook,
  newsItems,
  tooSimilar,
} from './kit';

const ASSESSMENT_LABELS = {
  confirmed: 'Reported',
  no_change: 'No change established',
  scenario: 'Scenario only',
  needs_data: 'Requires more data',
};
const HORIZON_LABELS = { near: 'Near term', medium: 'Medium term', sector: 'Sector' };
const SCOPE_LABELS = {
  company: 'Company',
  sector: 'Sector',
  market: 'Market',
  analyst: 'Analyst action',
};

const uniqueQuestions = (plan, list, max = 3) =>
  list
    .filter(Boolean)
    .filter((f) => !tooSimilar(f, plan.resolvedQuestion) && !tooSimilar(f, plan.originalQuestion))
    .filter((f, i, all) => all.findIndex((g) => tooSimilar(f, g)) === i)
    .slice(0, max);

function priceSource(sources, symbol, data, asOf) {
  return sources.add({
    key: `prices:${symbol}`,
    title: `${symbol} daily closing prices`,
    publisher: 'Market data',
    date: asOf,
    detail: ADJUSTMENT[data?.adjustment] || 'Daily closes.',
    kind: 'dataset',
  });
}

function newsTimeline(clusters, sources, existing = []) {
  const have = new Set(existing.map((t) => canonicalUrl(t.url)));
  const out = [...existing];
  for (const c of clusters) {
    if (have.has(c.lead.url)) continue;
    const date = c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null;
    out.push({
      date,
      title: c.lead.title,
      publisher: c.lead.publisher,
      url: c.lead.url,
      sourceClass: c.lead.sourceClass,
      corroboration: c.corroboration,
      cites: [
        sources.add({ url: c.lead.url, title: c.lead.title, publisher: c.lead.publisher, date }),
      ],
    });
  }
  return out.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

/* ── A03: leadership impact ─────────────────────────────────────────────── */

export async function runLeadershipImpact(plan, deps, now, telemetry, deadlineAt) {
  const planned = plan.entities.find((e) => e.type === 'company') || null;
  const plannedPerson = plan.entities.find((e) => e.type === 'person')?.label || null;
  const sources = sourceBook();
  const built = {};

  const research = deps.synthesize
    ? await step(
        telemetry,
        'live_research',
        Math.max(4000, (deadlineAt || Date.now() + 30000) - Date.now() - 6000),
        () =>
          researchLeadershipImpact(
            { synthesize: deps.synthesize },
            {
              question: plan.resolvedQuestion,
              person: plannedPerson,
              company: planned?.label,
              now,
              deadlineAt: deadlineAt ? deadlineAt - 6000 : undefined,
            },
          ),
      )
    : null;
  if (deps.synthesize && !research && !telemetry.degraded.includes('live_research'))
    telemetry.degraded.push('live_research');

  const companyName = planned?.label || research?.company || null;
  const ticker = planned?.ticker || research?.ticker || null;
  const person = plannedPerson || research?.person || null;
  const bench = ticker
    ? benchmarkFor({ ticker, industry: research?.industry || '', sector: '' })
    : null;
  const eventDate = research?.event.effectiveDate || research?.event.announcedDate || null;
  const reactionFrom = research?.event.announcedDate || eventDate;

  const [subjectBars, benchBars, clusters] = await Promise.all([
    ticker && reactionFrom && deps.getOhlcv
      ? step(telemetry, 'daily_bars', 5000, () => deps.getOhlcv(ticker, isoDaysAgo(now, 200)))
      : null,
    bench && reactionFrom && deps.getOhlcv
      ? step(telemetry, 'benchmark_bars', 5000, () =>
          deps.getOhlcv(bench.symbol, isoDaysAgo(now, 200)),
        )
      : null,
    newsItems(deps, telemetry, {
      tickers: ticker ? [ticker] : [],
      phrase: [person, companyName, 'CEO'].filter(Boolean).join(' '),
      entityTerms: [companyName, ticker, person, person?.split(' ').slice(-1)[0]].filter(Boolean),
      eventTerms: [
        'ceo',
        'chief executive',
        'resign',
        'interim',
        'board',
        'successor',
        'transition',
      ],
      now,
    }),
  ]);

  const cite = (urls) =>
    (urls || []).map((u) =>
      sources.add({ url: u, title: research?.titles?.[u] || hostOf(u), publisher: hostOf(u) }),
    );

  if (research) {
    const ev = research.event;
    built.lead = { headline: research.headline, text: research.answer, cites: cite(ev.sourceUrls) };
    built.verified_event_status = {
      status: ev.status,
      statusLabel: EVENT_STATUSES[ev.status],
      summary: ev.summary,
      facts: [
        ev.effectiveDate && { label: 'Effective', value: day(ev.effectiveDate) },
        ev.announcedDate && { label: 'Announced', value: day(ev.announcedDate) },
        ev.interim && {
          label: 'Interim',
          value: [ev.interim.name, ev.interim.role].filter(Boolean).join(', '),
        },
        ev.permanentSuccessor && {
          label: 'Permanent successor',
          value: [ev.permanentSuccessor.name, ev.permanentSuccessor.role]
            .filter(Boolean)
            .join(', '),
        },
      ]
        .filter(Boolean)
        .map((f) => ({ ...f, cites: cite(ev.sourceUrls) })),
      cites: cite(ev.sourceUrls),
      checkedAt: now.toISOString().slice(0, 10),
    };
    if (research.findings.length)
      built.key_findings = {
        title: 'Key takeaways',
        items: research.findings.map((f) => ({
          kicker: f.label,
          title: f.title,
          text: f.text,
          note: f.interpretation ? 'Analyst interpretation' : null,
          cites: cite(f.sourceUrls),
        })),
      };
    if (research.channels.length)
      built.scenario_matrix = {
        title: 'How the market may interpret it',
        label: 'Analyst interpretation, not a forecast',
        rows: research.channels.map((c) => ({
          kicker: HORIZON_LABELS[c.horizon],
          title: c.title,
          text: c.text,
        })),
      };
    if (research.exposures.length)
      built.impact_network = {
        title: 'Where the impact could travel',
        note: 'Analyst framework. Not predicted returns.',
        rows: research.exposures.map((e) => ({
          name: e.ticker || e.name,
          tag: e.relation,
          detail: e.ticker && e.name !== e.ticker ? e.name : null,
          channel: e.channel,
          evidence: e.evidence,
          assessment: e.assessment,
          assessmentLabel: ASSESSMENT_LABELS[e.assessment],
          cites: cite(e.sourceUrls),
        })),
      };
    if (research.baseline.length)
      built.fundamentals = {
        title: 'Operating baseline before the change',
        note: 'Most recently reported figures. They describe the business before the change, not its effect.',
        items: research.baseline.map((b) => ({
          label: b.label,
          value: b.value,
          sub: b.detail,
          cites: cite(b.sourceUrls),
        })),
      };
    if (research.watch.length)
      built.watchpoints = { title: 'What to monitor', items: research.watch };
  } else {
    built.lead = {
      headline: `Sonar could not verify this leadership change just now`,
      text: `The research step did not complete, so no event status, impact assessment or company figures are given. ${
        clusters.length ? 'Recent coverage from the news cache is listed below. ' : ''
      }Nothing is filled in from memory. Try again shortly.`,
    };
  }

  /* The measured reaction: computed, never asked of the model. */
  const reaction =
    subjectBars?.bars?.length && reactionFrom && research?.event.status !== 'hypothetical'
      ? sinceEvent(subjectBars.bars, benchBars?.bars || [], reactionFrom)
      : null;
  if (reaction) {
    const src = priceSource(sources, ticker, subjectBars, reaction.asOf);
    const rows = [
      {
        label: `${ticker} first session after the news`,
        value: pct(reaction.firstDay.pct),
        note: day(reaction.firstDay.date),
        method: `Close on ${day(reaction.firstDay.date)} against the prior close.`,
      },
      {
        label: `${ticker} since the announcement`,
        value: pct(reaction.movePct),
        note: `${reaction.sessions} trading session${reaction.sessions === 1 ? '' : 's'}`,
        method: `Close on ${day(reaction.asOf)} against the close on ${day(reaction.from)}.`,
      },
    ];
    if (reaction.benchPct != null)
      rows.push(
        {
          label: `${bench.label} (${bench.symbol}) over the same sessions`,
          value: pct(reaction.benchPct),
          note: 'Benchmark',
          method: 'Same two closes.',
        },
        {
          label: `${ticker} relative to the benchmark`,
          value: pct(reaction.relPct),
          note: reaction.relPct < 0 ? 'Lagged' : reaction.relPct > 0 ? 'Led' : 'In line',
          method: 'Difference between the two returns, in percentage points.',
        },
      );
    built.metric_table = {
      title: 'Measured price reaction',
      asOf: reaction.asOf,
      rows,
      cites: [src],
    };
  }

  if (ticker && bench) {
    built.price_comparison = {
      chart: {
        kicker: 'Market context',
        title: `${companyName || ticker} vs. ${bench.label}`,
        subject: { symbol: ticker, label: `${companyName || ticker} (${ticker})` },
        benchmark: { symbol: bench.symbol, label: `${bench.label} (${bench.symbol})` },
        event: eventDate ? { date: eventDate, label: 'Leadership change' } : null,
        defaultRange: '3M',
      },
    };
  }

  const timeline = newsTimeline(
    clusters,
    sources,
    (research?.timeline || []).map((t) => ({
      date: t.date,
      title: t.title,
      text: t.text,
      url: t.sourceUrls[0],
      publisher: hostOf(t.sourceUrls[0]),
      sourceClass: sourceClass(t.sourceUrls[0]),
      cites: cite(t.sourceUrls),
    })),
  );
  if (timeline.length)
    built.news_timeline = { title: 'What happened', items: timeline.slice(0, 10) };

  const subject = companyName || 'the company';
  const open = research && !research.event.permanentSuccessor;
  built.followups = {
    placeholder: 'Ask a follow-up about the transition, the price reaction or the sector…',
    related: uniqueQuestions(plan, [
      /* The neighbouring pipelines: succession, technicals and move attribution. */
      open ? `Who will replace ${person || 'the CEO'} as CEO of ${subject}?` : null,
      ticker ? `Is ${ticker} technically oversold?` : null,
      ticker ? `Why is ${ticker} stock moving this week?` : null,
      ...(research?.followups || []),
    ]),
  };

  const limits = [
    'Takeaways and exposures marked as interpretation are a reading of the event, not reported facts and not a forecast.',
  ];
  if (reaction)
    limits.push(
      'The price reaction is measured from daily closes. A move after an event is not shown to have been caused by it.',
    );
  if (!research && deps.synthesize)
    limits.push('The research step did not complete for this answer.');
  built.limitations = { items: limits };

  return {
    built,
    sources: sources.list,
    thread: {
      subject: companyName,
      ticker,
      person,
      headline: built.lead.headline,
      summary: built.lead.text,
      event: research?.event.status || null,
    },
  };
}

/* ── A05: why is it moving ──────────────────────────────────────────────── */

const times = (m) => (m == null ? null : `${m.toFixed(1)} times`);

export async function runMoveAttribution(plan, deps, now, telemetry, deadlineAt) {
  const company = plan.entities.find((e) => e.type === 'company');
  const symbol = company.ticker;
  const name = company.label || symbol;
  const sources = sourceBook();
  const built = {};
  const window = moveWindowOf(plan.resolvedQuestion, plan.controls?.window?.moveSessions || null);
  const bench = benchmarkFor({ ticker: symbol, industry: '', sector: '' });

  const [data, benchData] = await Promise.all([
    step(telemetry, 'daily_bars', 8000, () => deps.getOhlcv(symbol, isoDaysAgo(now, 200))),
    step(telemetry, 'benchmark_bars', 8000, () =>
      deps.getOhlcv(bench.symbol, isoDaysAgo(now, 200)),
    ),
  ]);
  const move = data?.bars?.length
    ? attributeMove(data.bars, benchData?.bars || [], { sessions: window.sessions })
    : null;

  const related = [
    `Is ${symbol} technically oversold?`,
    `How has ${symbol} performed against its sector over the past three months?`,
  ];

  if (!move) {
    built.lead = {
      headline: `Daily prices for ${symbol} are not available right now`,
      text: `Sonar measures a move from real daily closes before looking for causes. None could be retrieved for ${symbol}, so no move, no comparison and no explanation is given. Nothing is estimated in their place.`,
    };
    built.followups = { placeholder: `Ask a follow-up about ${symbol}…`, related };
    return { built, sources: sources.list, thread: { subject: name, ticker: symbol } };
  }

  const [research, clusters] = await Promise.all([
    deps.synthesize
      ? step(
          telemetry,
          'live_research',
          Math.max(4000, (deadlineAt || Date.now() + 20000) - Date.now() - 2500),
          () =>
            researchMoveCatalysts(
              { synthesize: deps.synthesize },
              {
                question: plan.resolvedQuestion,
                company: name,
                ticker: symbol,
                move,
                now,
                deadlineAt: deadlineAt ? deadlineAt - 2500 : undefined,
              },
            ),
        )
      : null,
    newsItems(deps, telemetry, {
      tickers: [symbol],
      phrase: name,
      entityTerms: [name, symbol],
      eventTerms: [
        'shares',
        'stock',
        'earnings',
        'guidance',
        'downgrade',
        'upgrade',
        'falls',
        'rises',
      ],
      now,
      limit: 6,
    }),
  ]);
  if (deps.synthesize && !research && !telemetry.degraded.includes('live_research'))
    telemetry.degraded.push('live_research');

  const priceSrc = priceSource(sources, symbol, data, move.asOf);
  const cite = (urls) =>
    (urls || []).map((u) =>
      sources.add({ url: u, title: research?.titles?.[u] || hostOf(u), publisher: hostOf(u) }),
    );

  /* The headline is assembled from the measurement. */
  const span =
    move.sessions === 1
      ? `on ${day(move.asOf)}`
      : `over the ${move.sessions} sessions to ${day(move.asOf)}`;
  const verb = move.direction === 'up' ? 'rose' : move.direction === 'down' ? 'fell' : 'was flat';
  const size = Math.abs(move.movePct).toFixed(1);
  const assumed = assumedDirection(plan.resolvedQuestion);
  const premiseWrong = assumed && move.direction !== 'flat' && assumed !== move.direction;
  const sizeClause =
    move.size === 'ordinary'
      ? 'within its ordinary range'
      : move.size === 'unknown'
        ? null
        : `about ${times(move.multiple)} its ordinary move`;
  const headline = premiseWrong
    ? `${name} is not ${assumed}: it ${verb} ${size}% ${span}${sizeClause ? `, ${sizeClause}` : ''}`
    : move.direction === 'flat'
      ? `${name} was little changed ${span}`
      : `${name} ${verb} ${size}% ${span}${sizeClause ? `, ${sizeClause}` : ''}`;

  const parts = [];
  if (move.benchPct != null) {
    const b = `${bench.label} (${bench.symbol}) ${move.benchPct >= 0 ? 'rose' : 'fell'} ${Math.abs(move.benchPct).toFixed(1)}% over the same window`;
    parts.push(
      move.scope === 'broad'
        ? `${b}, so most of the move was shared with the benchmark.`
        : move.scope === 'specific'
          ? `${b}, so the move was largely specific to ${name}.`
          : move.scope === 'mixed'
            ? `${b}, so part of the move was shared with the benchmark and part was not.`
            : `${b}.`,
    );
  }
  if (move.volumeRatio != null)
    parts.push(
      `Volume ran at ${move.volumeRatio.toFixed(1)} times its 20-session average${
        move.volumeRatio >= 1.5 ? ', which is elevated' : ''
      }.`,
    );
  if (research?.summary) parts.push(research.summary);
  else if (research && !research.catalysts.length)
    parts.push(
      'No dated company announcement or report was found in the window that accounts for it.',
    );
  else if (!research)
    parts.push(
      clusters.length
        ? 'The search for reported causes did not complete; recent coverage from the news cache is listed below as context.'
        : 'The search for reported causes did not complete, so no cause is offered.',
    );
  built.lead = { headline, text: parts.join(' '), cites: [priceSrc] };

  built.price_comparison = {
    chart: {
      kicker: 'The move',
      title: `${name} vs. ${bench.label}`,
      subject: { symbol, label: `${name} (${symbol})` },
      benchmark: { symbol: bench.symbol, label: `${bench.label} (${bench.symbol})` },
      event: null,
      defaultRange: window.range,
    },
  };

  const rows = [
    {
      label: move.sessions === 1 ? 'Move in the session' : `Move over ${move.sessions} sessions`,
      value: pct(move.movePct),
      note: `${usd(move.baseClose)} to ${usd(move.lastClose)}`,
      method: `Close on ${day(move.asOf)} against the close on ${day(move.from)}.`,
    },
  ];
  if (move.typicalPct != null)
    rows.push({
      label: 'Ordinary move for this window',
      value: `±${move.typicalPct.toFixed(1)}%`,
      note:
        move.size === 'ordinary'
          ? 'This move is inside it'
          : `This move is ${times(move.multiple)} that`,
      method:
        'One standard deviation of daily returns over the 60 sessions before the window, scaled to its length.',
    });
  if (move.benchPct != null)
    rows.push(
      {
        label: `${bench.label} (${bench.symbol})`,
        value: pct(move.benchPct),
        note: 'Same window',
        method: 'Same two closes.',
      },
      {
        label: 'Relative to the benchmark',
        value: pct(move.relPct),
        note:
          move.scope === 'broad'
            ? 'Mostly shared with the benchmark'
            : move.scope === 'specific'
              ? 'Mostly specific to the company'
              : move.scope === 'mixed'
                ? 'Partly shared'
                : 'Too small to split',
        method: 'Difference between the two returns, in percentage points.',
      },
    );
  if (move.volumeRatio != null)
    rows.push({
      label: 'Volume',
      value: `${move.volumeRatio.toFixed(1)}x`,
      note: move.volumeRatio >= 1.5 ? 'Elevated' : move.volumeRatio <= 0.7 ? 'Light' : 'Ordinary',
      method: 'Average volume in the window against the 20 sessions before it.',
    });
  if (move.biggestDay)
    rows.push({
      label: 'Largest single session',
      value: pct(move.biggestDay.pct),
      note: day(move.biggestDay.date),
      method: 'Largest absolute close-to-close change inside the window.',
    });
  built.metric_table = { title: 'The move, measured', asOf: move.asOf, rows, cites: [priceSrc] };

  if (research?.catalysts.length)
    built.key_findings = {
      title: 'What was reported in the window',
      label: 'Reported items in date order. Timing is shown; cause is not established by timing.',
      items: research.catalysts.map((c) => ({
        kicker: `${day(c.date)} / ${SCOPE_LABELS[c.scope]}`,
        title: c.title,
        text: c.text,
        note:
          c.date < move.from
            ? 'Before the window'
            : c.date > move.asOf
              ? 'After the latest close measured'
              : null,
        cites: cite(c.sourceUrls),
      })),
    };

  const timeline = newsTimeline(clusters, sources);
  if (timeline.length)
    built.news_timeline = {
      title: 'Recent coverage',
      note: 'Context from the news cache. Coverage that coincided with a price move is not shown to have caused it.',
      items: timeline.slice(-8),
    };

  if (research?.watch.length)
    built.watchpoints = { title: 'What to monitor', items: research.watch };

  const leadership = (research?.catalysts || []).some((c) =>
    /\b(ceo|chief executive|resign|steps? down|successor|interim)\b/i.test(`${c.title} ${c.text}`),
  );
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}’s move…`,
    related: uniqueQuestions(plan, [
      leadership ? `How will the leadership change affect ${name} and its industry?` : null,
      leadership ? `Who will replace the CEO of ${name}?` : null,
      ...related,
      ...(research?.followups || []),
    ]),
  };

  const limits = [
    'The move is measured from daily closes, so it reflects completed sessions and not trading during the current one.',
    'A report dated inside the window is shown with its timing. Sonar does not state that it caused the move.',
  ];
  const ageDays = Math.round((now.getTime() - Date.parse(`${move.asOf}T00:00:00Z`)) / 86400000);
  if (ageDays > 4)
    limits.push(`The latest daily close available is ${day(move.asOf)}, ${ageDays} days ago.`);
  if (!research && deps.synthesize)
    limits.push('The search for reported causes did not complete for this answer.');
  built.limitations = { items: limits };

  return {
    built,
    sources: sources.list,
    thread: {
      subject: name,
      ticker: symbol,
      headline,
      summary: parts.slice(0, 2).join(' '),
    },
  };
}
