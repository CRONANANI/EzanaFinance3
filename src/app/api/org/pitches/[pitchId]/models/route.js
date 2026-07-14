import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, fetchPitchRaw, MANAGER_ROLES } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Desk fallback when a team has no org_desk_config row (mirrors the column default).
const DEFAULT_REQUIRED_MODELS = ['dcf', 'three_statement', 'comps', 'earnings_analysis'];

/**
 * Read the desk's required_models (org_desk_config for pitch.team_id, falling
 * back to the default array) and this pitch's org_pitch_model rows, then merge
 * into a per-required-model checklist the panel renders directly. The gate
 * `required_models_complete` counts model_type ∈ required_models with
 * reviewed_at not null — this payload surfaces exactly that state per row.
 */
async function buildModelsPayload(supabase, pitch) {
  const [{ data: deskConfig }, { data: modelRows }] = await Promise.all([
    supabase
      .from('org_desk_config')
      .select('required_models')
      .eq('team_id', pitch.team_id)
      .maybeSingle(),
    supabase
      .from('org_pitch_model')
      .select(
        'id, model_type, file_url, version, complete, uploaded_by, reviewed_by, reviewed_at, created_at',
      )
      .eq('pitch_id', pitch.id),
  ]);

  const requiredModels =
    Array.isArray(deskConfig?.required_models) && deskConfig.required_models.length
      ? deskConfig.required_models
      : DEFAULT_REQUIRED_MODELS;

  const byType = new Map((modelRows || []).map((m) => [m.model_type, m]));

  const checklist = requiredModels.map((type) => {
    const row = byType.get(type) || null;
    const uploaded = !!(row && row.file_url);
    const reviewed = !!(row && row.reviewed_at);
    return {
      model_type: type,
      model_id: row?.id || null,
      file_url: row?.file_url || null,
      version: row?.version || null,
      uploaded,
      reviewed,
      reviewed_at: row?.reviewed_at || null,
      reviewed_by: row?.reviewed_by || null,
      uploaded_by: row?.uploaded_by || null,
      // "complete" for the gate = required AND reviewed.
      complete: uploaded && reviewed,
    };
  });

  const completeCount = checklist.filter((c) => c.complete).length;

  return {
    requiredModels,
    checklist,
    // Extra models not in the required set (uploaded but no longer required).
    extraModels: (modelRows || []).filter((m) => !requiredModels.includes(m.model_type)),
    completeCount,
    requiredCount: requiredModels.length,
  };
}

/**
 * GET /api/org/pitches/[pitchId]/models
 * Returns the desk's required models + this pitch's upload/review state so the
 * ModelChecklistPanel can render each required model as complete/incomplete.
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId || !viewer)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const payload = await buildModelsPayload(supabase, pitch);
    return NextResponse.json({
      ...payload,
      canReview: MANAGER_ROLES.includes(viewer.role),
    });
  },
  { requireAuth: true },
);

/**
 * POST /api/org/pitches/[pitchId]/models
 *  - Upload:  { model_type, file_url }  → upsert org_pitch_model on
 *             (pitch_id, model_type), uploaded_by = member.id. Re-uploading a
 *             model bumps version and clears any prior review (a new file must
 *             be re-reviewed).
 *  - Review:  { model_type, reviewed: true } → set reviewed_by = member.id,
 *             reviewed_at = now(), complete = true. Only a PM/exec may review;
 *             a model row must already exist to review it.
 */
export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, member, orgId } = await getPitchContext();
    if (!orgId || !member)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const modelType = typeof body.model_type === 'string' ? body.model_type.trim() : '';
    if (!modelType) {
      return NextResponse.json({ error: 'model_type required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('org_pitch_model')
      .select('id, version')
      .eq('pitch_id', pitch.id)
      .eq('model_type', modelType)
      .maybeSingle();

    const now = new Date().toISOString();

    // ── Review path ──────────────────────────────────────────────────────────
    if (body.reviewed === true) {
      // Only a PM/exec may set reviewed_at — a model cannot review itself.
      if (!MANAGER_ROLES.includes(member.role)) {
        return NextResponse.json(
          { error: 'Only a portfolio manager or executive may mark a model reviewed' },
          { status: 403 },
        );
      }
      if (!existing) {
        return NextResponse.json(
          { error: 'Upload the model before marking it reviewed' },
          { status: 404 },
        );
      }
      const { error } = await supabase
        .from('org_pitch_model')
        .update({ reviewed_by: member.id, reviewed_at: now, complete: true })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      const payload = await buildModelsPayload(supabase, pitch);
      return NextResponse.json({ ...payload, canReview: true });
    }

    // ── Upload path ──────────────────────────────────────────────────────────
    const fileUrl = typeof body.file_url === 'string' ? body.file_url.trim() : '';
    if (!fileUrl) {
      return NextResponse.json({ error: 'file_url required' }, { status: 400 });
    }

    if (existing) {
      // New file for an existing slot → bump version, reset review state.
      const { error } = await supabase
        .from('org_pitch_model')
        .update({
          file_url: fileUrl,
          uploaded_by: member.id,
          version: (existing.version || 1) + 1,
          reviewed_by: null,
          reviewed_at: null,
          complete: false,
        })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await supabase.from('org_pitch_model').insert({
        pitch_id: pitch.id,
        org_id: orgId,
        model_type: modelType,
        file_url: fileUrl,
        version: 1,
        uploaded_by: member.id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const payload = await buildModelsPayload(supabase, pitch);
    return NextResponse.json({ ...payload, canReview: MANAGER_ROLES.includes(member.role) });
  },
  { requireAuth: true },
);
