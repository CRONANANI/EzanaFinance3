import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const slug = searchParams.get('slug');

    let query = supabase
      .from('personas')
      .select('id, slug, name, type, short_bio, investment_philosophy, sector_biases, risk_profile, time_horizon, key_metrics, notable_holdings, sort_order')
      .order('sort_order', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    if (slug) {
      query = query.eq('slug', slug);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Personas fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch personas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ personas: data ?? [] });
  } catch (error) {
    console.error('Personas route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = getServerSupabase();
    const body = await request.json();

    const {
      slug, name, type, short_bio, investment_philosophy,
      system_prompt, sector_biases, risk_profile, time_horizon,
      key_metrics, notable_holdings, sort_order,
    } = body;

    if (!slug || !name || !type || !system_prompt) {
      return NextResponse.json(
        { error: 'slug, name, type, and system_prompt are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('personas')
      .upsert(
        {
          slug,
          name,
          type,
          short_bio: short_bio ?? null,
          investment_philosophy: investment_philosophy ?? null,
          system_prompt,
          sector_biases: sector_biases ?? [],
          risk_profile: risk_profile ?? 'moderate',
          time_horizon: time_horizon ?? 'medium',
          key_metrics: key_metrics ?? [],
          notable_holdings: notable_holdings ?? [],
          sort_order: sort_order ?? 99,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (error) {
      console.error('Persona upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save persona', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ persona: data });
  } catch (error) {
    console.error('Personas POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
