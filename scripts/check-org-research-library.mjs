/**
 * Research Library (/org-team-hub/research-library): the page model and the
 * sample bundle. Pure modules only; nothing here touches a database.
 *
 *   node --no-warnings --test scripts/check-org-research-library.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  NA,
  addressQuery,
  countByNote,
  decorate,
  emptyFilters,
  fmtSignedPct,
  librarySummary,
  noteRights,
  parseAddress,
  readiness,
  searchLocal,
  shelves,
  toCsv,
  visibleRows,
} from '../src/lib/org-research-library-model.js';
import {
  applySampleAction,
  buildResearchLibrarySample,
  deriveDossier,
  deriveLibrary,
  deriveLineage,
} from '../src/lib/org-research-library-sample.js';

const viewer = (role, extra = {}) => ({
  userId: 'me',
  role,
  canManage: role !== 'analyst',
  ...extra,
});
const doc = (o = {}) => ({
  id: 'd1',
  author_id: 'other',
  status: 'draft',
  doc_type: 'note',
  visibility: 'org',
  ...o,
});

test('rights mirror the routes: publish, pin, exemplar, delete', () => {
  const others = doc({ status: 'under_review' });
  assert.equal(noteRights(others, viewer('analyst')).canPublish, false);
  assert.equal(noteRights(others, viewer('analyst')).canEdit, false);
  assert.equal(noteRights(others, viewer('executive')).canPublish, true);
  assert.equal(noteRights(others, viewer('portfolio_manager')).canPublish, false);
  assert.equal(
    noteRights(others, viewer('portfolio_manager', { canApprove: true })).canPublish,
    true,
  );
  const mine = doc({ author_id: 'me', status: 'draft' });
  const r = noteRights(mine, viewer('analyst'));
  assert.equal(r.canPublish, true);
  assert.equal(r.canPin, true, 'the PATCH route accepts a pin from the author');
  assert.equal(r.canExemplar, false);
  assert.equal(r.deleteLabel, 'Delete');
  const pub = noteRights(doc({ author_id: 'me', status: 'published' }), viewer('analyst'));
  assert.equal(pub.deleteLabel, 'Archive');
  assert.equal(pub.canSupersede, true);
  assert.equal(noteRights(doc({ status: 'archived' }), viewer('executive')).canDelete, false);
  assert.equal(noteRights(doc({ status: 'superseded' }), viewer('executive')).canEdit, false);
});

test('readiness lists the three publish blockers', () => {
  const templates = [
    { name: 'Pitch memo', doc_type: 'pitch_memo', required_sections: ['Thesis', 'Risks'] },
  ];
  const n = doc({ doc_type: 'pitch_memo', abstract: '', body: '## Thesis' });
  const items = readiness(n, { openBlocks: 2, templates });
  assert.deepEqual(
    items.filter((i) => i.ok === false).map((i) => i.code),
    ['abstract_missing', 'sections_missing', 'review_blocks_open'],
  );
  const unknown = readiness(n, { openBlocks: 0, templates: null });
  assert.equal(unknown.find((i) => i.code === 'sections_missing').ok, null);
});

test('visibility and counts: private only for the author, drafts for author and managers', () => {
  const rows = [
    doc({ id: 'a', status: 'draft' }),
    doc({ id: 'b', visibility: 'private', status: 'published' }),
    doc({ id: 'c', author_id: 'me', visibility: 'private', status: 'draft' }),
    doc({ id: 'd', status: 'published' }),
  ];
  assert.deepEqual(
    visibleRows(rows, { userId: 'me', isManager: false }).map((r) => r.id),
    ['c', 'd'],
  );
  assert.deepEqual(
    visibleRows(rows, { userId: 'me', isManager: true }).map((r) => r.id),
    ['a', 'c', 'd'],
  );
  const counts = countByNote(
    [
      { note_id: 'a', is_review_block: true, resolved: false },
      { note_id: 'a', is_review_block: true, resolved: true },
      { note_id: 'a' },
    ],
    [{ note_id: 'a' }],
  );
  const [a] = decorate([rows[0]], counts);
  assert.deepEqual([a.file_count, a.comment_count, a.open_blocks], [1, 3, 1]);
  const s = librarySummary(decorate(rows, counts), { userId: 'me' });
  assert.deepEqual(s, { published: 2, underReview: 0, myDrafts: 1, openBlocks: 1 });
});

test('shelves: review longest waiting first, exemplars are a flag on published work', () => {
  const rows = [
    doc({ id: 'r1', status: 'under_review', updated_at: '2026-11-10T00:00:00Z' }),
    doc({ id: 'r2', status: 'under_review', updated_at: '2026-11-01T00:00:00Z' }),
    doc({ id: 'e1', status: 'published', is_exemplar: true }),
    doc({ id: 'e2', status: 'draft', is_exemplar: true }),
  ];
  const sh = shelves(rows, { userId: 'me' });
  assert.deepEqual(
    sh.review.map((r) => r.id),
    ['r2', 'r1'],
  );
  assert.deepEqual(
    sh.exemplars.map((r) => r.id),
    ['e1'],
  );
});

test('the page address round-trips view, search, filters and the open document', () => {
  const state = {
    view: 'library',
    q: 'margin',
    filters: { ...emptyFilters(), type: ['note', 'model'], ticker: ['nvda'] },
    open: 'abc',
  };
  const qs = addressQuery(state);
  const sp = new URLSearchParams(qs);
  const back = parseAddress((k) => sp.get(k));
  assert.equal(back.q, 'margin');
  assert.deepEqual(back.filters.type, ['note', 'model']);
  assert.deepEqual(back.filters.ticker, ['NVDA']);
  assert.equal(back.open, 'abc');
  assert.equal(parseAddress(() => null).view, 'library');
  assert.equal(parseAddress((k) => (k === 'view' ? 'nope' : null)).view, 'library');
});

test('local search: keyword, facets counted with the other filters, pinned first', () => {
  const rows = [
    doc({ id: '1', title: 'Bank margin', doc_type: 'note', created_at: '2026-01-01' }),
    doc({ id: '2', title: 'Bank primer', doc_type: 'primer', created_at: '2026-02-01' }),
    doc({
      id: '3',
      title: 'Chip margin',
      doc_type: 'note',
      pinned: true,
      created_at: '2025-01-01',
    }),
  ];
  const r = searchLocal(rows, 'margin', { ...emptyFilters(), type: ['note'] });
  assert.deepEqual(
    r.notes.map((n) => n.id),
    ['3', '1'],
  );
  assert.deepEqual(r.facets.type, { note: 2 });
});

test('formats: signed percentages, N/A, CSV formula guard', () => {
  assert.equal(fmtSignedPct(12), '+12.0%');
  assert.equal(fmtSignedPct(-3.25), '-3.3%');
  assert.equal(fmtSignedPct(null), NA);
  assert.equal(NA, 'N/A');
  assert.match(toCsv([{ a: '=SUM(1)' }]), /"'=SUM\(1\)"/);
});

test('sample bundle: same council, no real names, real types and kinds, labelled', () => {
  const b = buildResearchLibrarySample({ userId: 'me', role: 'executive', displayName: 'Viewer' });
  const names = new Set(b.members.map((m) => m.display_name));
  for (const n of ['Amara Tesfaye', 'Selam Haile', 'Chidi Okoye', 'Elena Rossi', 'Jonas Weber'])
    assert.ok(names.has(n), n);
  const types = new Set([
    'note',
    'pitch_memo',
    'model',
    'primer',
    'post_mortem',
    'ic_minutes',
    'reading',
    'competition',
    'external',
  ]);
  for (const n of b.notes) {
    assert.ok(types.has(n.doc_type), n.doc_type);
    assert.equal(n.is_demo, true);
    assert.ok(!/@/.test(n.body), 'no mentions');
  }
  for (const a of b.attachments)
    assert.ok(['pdf', 'sheet', 'doc', 'deck', 'image'].includes(a.kind));
  const lib = deriveLibrary(b, '', emptyFilters());
  assert.ok(lib.shelves.review.length > 0 && lib.shelves.exemplars.length > 0);
  assert.ok(deriveLineage(b).tickers.some((t) => t.stale));
  const d = deriveDossier(b, 'NVDA');
  for (let i = 1; i < d.docs.length; i += 1)
    assert.ok(new Date(d.docs[i - 1].created_at) >= new Date(d.docs[i].created_at), 'newest first');
});

test('sample actions follow the server rules and never touch the original', () => {
  const b = buildResearchLibrarySample({ userId: 'me', role: 'analyst', displayName: 'Viewer' });
  const before = JSON.stringify(b);
  const blocked = applySampleAction(b, { type: 'publish', id: 'sample-doc-003' });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.blockers.some((x) => x.code === 'review_blocks_open'));
  assert.equal(
    applySampleAction(b, { type: 'exemplar', id: 'sample-doc-001', value: true }).ok,
    false,
  );
  const c = applySampleAction(b, { type: 'comment', id: 'sample-doc-001', body: 'x', block: true });
  assert.equal(c.bundle.comments.at(-1).is_review_block, false, 'analysts cannot raise a block');
  const del = applySampleAction(b, { type: 'delete', id: 'sample-doc-003' });
  assert.ok(!del.bundle.notes.some((n) => n.id === 'sample-doc-003'));
  assert.equal(JSON.stringify(b), before);
});

test('the server search adds counts, KPIs and shelves only for the library page', () => {
  const src = fs.readFileSync('src/app/api/org/research-notes/_shared.js', 'utf8');
  assert.match(src, /withLibraryExtras/);
  assert.match(src, /approve_deliverables/);
  assert.match(
    fs.readFileSync('src/app/api/org/research-notes/search/route.js', 'utf8'),
    /withLibraryExtras: true/,
  );
  const page = fs.readFileSync('src/components/org/research-library/DocumentPanel.jsx', 'utf8');
  assert.match(page, /Blocks publish until resolved/);
  assert.ok(!/Drafts stay private/i.test(page));
});
