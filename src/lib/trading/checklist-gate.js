/**
 * Server-side gate for opening a brokerage account (QA RET-13).
 *
 * The route used to trust `profiles.checklist_completed`, a flag the browser
 * writes. The gate is now computed here from:
 *   1. the per-task progress map, checked against the canonical task list
 *      (unknown keys and non-true values do not count), and
 *   2. evidence in the database for the tasks that leave a record: a
 *      watchlist item (watchlist_1), a mock trade (action_2) and a completed
 *      lesson (learning_1 / learning_3).
 * Tasks that are pure page visits (view a profile, filter a table) leave no
 * record, so for those the progress map is the only signal there is.
 *
 * An evidence read that errors (table missing, timeout) does not block: the
 * gate fails on missing evidence, never on infrastructure.
 */
import { CHECKLIST_TASKS } from '@/config/checklist';

export const TASK_IDS = Object.keys(CHECKLIST_TASKS);

/** "Complete these checklist tasks first: A, B and 2 more". */
export function gateMessage(missing) {
  const titles = (missing || []).map((id) => CHECKLIST_TASKS[id]?.title).filter(Boolean);
  if (!titles.length) return 'Complete all checklist tasks first';
  const shown = titles.slice(0, 3).join(', ');
  const more = titles.length > 3 ? ` and ${titles.length - 3} more` : '';
  return `Complete these checklist tasks first: ${shown}${more}`;
}

/** Task ids the progress map marks done, restricted to real tasks. */
export function doneTaskIds(progress) {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return [];
  return TASK_IDS.filter((id) => progress[id] === true);
}

const EVIDENCE = [
  {
    tasks: ['watchlist_1'],
    check: (db, uid) => db.from('user_watchlist_items').select('id').eq('user_id', uid).limit(1),
    ok: (rows) => rows.length > 0,
  },
  {
    tasks: ['action_2'],
    check: (db, uid) => db.from('mock_trades').select('id').eq('user_id', uid).limit(1),
    ok: (rows) => rows.length > 0,
  },
  {
    tasks: ['learning_1', 'learning_3'],
    check: (db, uid) =>
      db
        .from('user_course_progress')
        .select('reading_complete, status')
        .eq('user_id', uid)
        .limit(200),
    ok: (rows) => rows.some((r) => r.reading_complete === true || r.status === 'completed'),
  },
];

/**
 * @returns {Promise<{ ok: boolean, missing: string[] }>} `missing` lists the
 *   task ids that are not done or not backed by a record.
 */
export async function checklistGate(db, userId) {
  const { data: profile, error } = await db
    .from('profiles')
    .select('checklist_progress')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`profiles read: ${error.message}`);

  const done = new Set(doneTaskIds(profile?.checklist_progress));
  const missing = TASK_IDS.filter((id) => !done.has(id));
  if (missing.length) return { ok: false, missing };

  const unbacked = [];
  await Promise.all(
    EVIDENCE.map(async (e) => {
      try {
        const { data, error: evErr } = await e.check(db, userId);
        if (evErr) return; /* infrastructure, not the user's fault */
        if (!e.ok(data || [])) unbacked.push(...e.tasks);
      } catch {
        /* same: never block on a failed read */
      }
    }),
  );
  return { ok: unbacked.length === 0, missing: unbacked };
}
