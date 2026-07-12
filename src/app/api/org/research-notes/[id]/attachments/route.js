import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'org-uploads';
const SIGN_TTL = 300; // 5 minutes
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/* Content-type allowlist keyed by a friendly extension. The browser MIME is the
   primary gate; a generic type (octet-stream / empty) is allowed only when the
   extension is on this list, so real docs from odd clients still get through. */
const ALLOWED = {
  pdf: ['application/pdf'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  doc: ['application/msword'],
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};
const GENERIC = ['', 'application/octet-stream', 'binary/octet-stream'];

/** Coarse category stored in org_research_attachments.kind for at-a-glance grouping. */
const KIND_BY_EXT = {
  pdf: 'pdf',
  xlsx: 'sheet',
  xls: 'sheet',
  csv: 'sheet',
  docx: 'doc',
  doc: 'doc',
  pptx: 'deck',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
};

/** Strip directories and neutralize unsafe characters so the object key is well-formed. */
function safeFileName(name) {
  const base =
    String(name || 'file')
      .split(/[\\/]/)
      .pop() || 'file';
  const cleaned = base
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'file').slice(0, 180);
}

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

/** Accept when the extension is allowed AND (MIME matches that extension OR is generic). */
function validateType(fileName, contentType) {
  const ext = extOf(fileName);
  const allowedMimes = ALLOWED[ext];
  if (!allowedMimes) return false;
  const ct = (contentType || '').toLowerCase().split(';')[0].trim();
  return allowedMimes.includes(ct) || GENERIC.includes(ct);
}

async function loadNote(supabase, orgId, noteId) {
  const { data } = await supabase
    .from('org_research_notes')
    .select('id')
    .eq('id', noteId)
    .eq('org_id', orgId)
    .maybeSingle();
  return data || null;
}

function withSignedUrls(supabase, rows) {
  return Promise.all(
    (rows || []).map(async (row) => {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGN_TTL);
      return { ...row, signed_url: data?.signedUrl || null };
    }),
  );
}

/* GET /api/org/research-notes/[id]/attachments — metadata rows (RLS respects
   note visibility) each with a short-lived signed download URL. */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;

    const note = await loadNote(supabase, member.org_id, id);
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: rows, error } = await supabase
      .from('org_research_attachments')
      .select(
        'id, note_id, org_id, file_name, storage_path, kind, size_bytes, uploaded_by, created_at',
      )
      .eq('org_id', member.org_id)
      .eq('note_id', id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const attachments = await withSignedUrls(supabase, rows);
    return NextResponse.json({
      attachments,
      viewer: { userId: member.user_id, canManage: assertOrgRole(member, MANAGER_ROLES) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/research-notes/[id]/attachments — multipart file upload under
   {org_id}/research/{noteId}/{uuid}-{safeName} with the member's own (RLS-gated)
   client, then records the metadata row. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;

    const note = await loadNote(supabase, member.org_id, id);
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let form;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
    }
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const size = file.size ?? 0;
    if (size <= 0) return NextResponse.json({ error: 'The file is empty.' }, { status: 400 });
    if (size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 25 MB limit.' }, { status: 413 });
    }

    const rawName = file.name || 'file';
    if (!validateType(rawName, file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, Word, Excel, CSV, PowerPoint, PNG, JPG.' },
        { status: 415 },
      );
    }

    const safeName = safeFileName(rawName);
    const kind = KIND_BY_EXT[extOf(rawName)] || 'file';
    const path = `${member.org_id}/research/${id}/${crypto.randomUUID()}-${safeName}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: row, error: insErr } = await supabase
      .from('org_research_attachments')
      .insert({
        note_id: id,
        org_id: member.org_id,
        file_name: safeName,
        storage_path: path,
        kind,
        size_bytes: size,
        uploaded_by: member.user_id,
      })
      .select(
        'id, note_id, org_id, file_name, storage_path, kind, size_bytes, uploaded_by, created_at',
      )
      .single();
    if (insErr) {
      // Roll the orphaned object back so storage and metadata stay in lockstep.
      await supabase.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const [attachment] = await withSignedUrls(supabase, [row]);
    return NextResponse.json({ attachment }, { status: 201 });
  },
  { requireAuth: true },
);

/* DELETE /api/org/research-notes/[id]/attachments?attachmentId=… — removes the
   storage object then the metadata row. Uploader or a manager only (RLS also
   gates the delete). */
export const DELETE = withApiGuard(
  async (request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;
    const attachmentId = new URL(request.url).searchParams.get('attachmentId');
    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId is required.' }, { status: 400 });
    }

    const { data: row } = await supabase
      .from('org_research_attachments')
      .select('id, storage_path, uploaded_by')
      .eq('org_id', member.org_id)
      .eq('note_id', id)
      .eq('id', attachmentId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isManager = assertOrgRole(member, MANAGER_ROLES);
    if (row.uploaded_by !== member.user_id && !isManager) {
      return NextResponse.json(
        { error: 'Only the uploader or a manager can delete.' },
        { status: 403 },
      );
    }

    await supabase.storage.from(BUCKET).remove([row.storage_path]);
    const { error: delErr } = await supabase
      .from('org_research_attachments')
      .delete()
      .eq('org_id', member.org_id)
      .eq('id', attachmentId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: attachmentId });
  },
  { requireAuth: true },
);
