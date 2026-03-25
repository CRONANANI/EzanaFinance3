/**
 * Optional: upsert course metadata into Supabase `courses` table (for admin/CMS parity).
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: npm run seed:learning
 */
import { createClient } from '@supabase/supabase-js';
import { ALL_COURSES } from '../src/lib/learning-curriculum.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const rows = ALL_COURSES.map((c) => ({
  id: c.id,
  track: c.track,
  level: c.level,
  level_order: c.level_order,
  course_order: c.course_order,
  title: c.title,
  description: c.description,
  duration_minutes: c.duration_minutes,
  has_quiz: true,
  content: {},
  quiz_questions: [],
}));

const { error } = await supabase.from('courses').upsert(rows, { onConflict: 'id' });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Upserted ${rows.length} courses.`);
