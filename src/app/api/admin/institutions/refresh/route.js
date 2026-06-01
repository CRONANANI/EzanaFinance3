import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { refreshInstitutionRegistry } from '@/lib/portfolio/institution-registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const stats = await refreshInstitutionRegistry();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error('[admin/institutions/refresh] failed', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
