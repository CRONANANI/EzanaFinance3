import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VARIABLE_LABELS = {
  temperature_2m_max: 'Daily High Temperature',
  temperature_2m_min: 'Daily Low Temperature',
  precipitation_sum: 'Precipitation',
  windspeed_10m_max: 'Wind Speed',
  shortwave_radiation_sum: 'Solar Radiation',
};

const COMMODITY_LABELS = {
  'CL=F': 'Crude Oil (WTI)',
  'NG=F': 'Natural Gas',
  'GC=F': 'Gold',
  'SI=F': 'Silver',
  'HG=F': 'Copper',
  'ZW=F': 'Wheat',
  'ZC=F': 'Corn',
  'ZS=F': 'Soybeans',
  'KC=F': 'Coffee',
  'CC=F': 'Cocoa',
};

/**
 * GET /api/kairos/correlations?region=<region_id>&minR=0.2&maxP=0.05
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('region');
    const minR = Number(searchParams.get('minR') || '0.2');
    const maxP = Number(searchParams.get('maxP') || '0.05');
    const limit = Math.min(20, Number(searchParams.get('limit') || '10'));

    if (!regionId) {
      return NextResponse.json({ error: 'region required' }, { status: 400 });
    }

    const { data: rows, error } = await supabase
      .from('kairos_correlations')
      .select('*')
      .eq('region_id', regionId)
      .lte('p_value', maxP);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (rows || []).filter((r) => Math.abs(Number(r.pearson_r)) >= minR);

    filtered.sort((a, b) => {
      const scoreA = Math.abs(Number(a.pearson_r)) * Math.log(a.sample_count || 1);
      const scoreB = Math.abs(Number(b.pearson_r)) * Math.log(b.sample_count || 1);
      return scoreB - scoreA;
    });

    const top = filtered.slice(0, limit).map((r) => ({
      id: r.id,
      region_id: r.region_id,
      commodity_symbol: r.commodity_symbol,
      commodity_label: COMMODITY_LABELS[r.commodity_symbol] || r.commodity_symbol,
      weather_variable: r.weather_variable,
      weather_label: VARIABLE_LABELS[r.weather_variable] || r.weather_variable,
      lookahead_days: r.lookahead_days,
      pearson_r: Number(r.pearson_r),
      p_value: r.p_value != null ? Number(r.p_value) : null,
      sample_count: r.sample_count,
      top_quintile_mean_return:
        r.top_quintile_mean_return != null ? Number(r.top_quintile_mean_return) : null,
      bottom_quintile_mean_return:
        r.bottom_quintile_mean_return != null ? Number(r.bottom_quintile_mean_return) : null,
      computed_at: r.computed_at,
    }));

    return NextResponse.json({
      region: regionId,
      count: top.length,
      total_significant: filtered.length,
      correlations: top,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
