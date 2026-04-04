import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

function topicFromCategory(cat) {
  const c = (cat || '').toLowerCase();
  if (/crypto|bitcoin|defi|blockchain/.test(c)) return 'Crypto & Digital Assets';
  if (/commod|oil|opec|energy|gold/.test(c)) return 'Commodities';
  if (/bet|predict|sportsbook/.test(c)) return 'Betting Markets';
  if (/risk|psych|behavior/.test(c)) return 'Risk & Psychology';
  return 'Stocks & Investing';
}

export async function GET() {
  try {
    const { data: articles, error } = await supabaseAdmin
      .from('echo_articles')
      .select(
        'id, author_id, author_name, author_avatar, article_title, article_slug, article_excerpt, article_category, read_time_minutes, published_at'
      )
      .eq('article_status', 'published')
      .order('published_at', { ascending: false })
      .limit(40);

    if (error) {
      console.error('partner-content articles:', error);
      return NextResponse.json({ items: [], fallback: true });
    }

    if (!articles?.length) {
      return NextResponse.json({ items: [], fallback: true });
    }

    const authorIds = [...new Set(articles.map((a) => a.author_id).filter(Boolean))];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_settings, is_partner, partner_type')
      .in('id', authorIds);

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const partnerArticles = articles.filter((a) => a.author_id && profileById.get(a.author_id)?.is_partner);

    const items = partnerArticles.slice(0, 9).map((a) => {
      const p = profileById.get(a.author_id);
      const role = p?.partner_type === 'creator' ? 'Creator' : 'Partner';
      const name = (p?.full_name || a.author_name || 'Partner').trim();
      const avatarUrl = a.author_avatar || p?.user_settings?.avatar_url || null;
      return {
        id: a.id,
        authorId: a.author_id,
        name,
        role,
        avatarUrl,
        title: a.article_title,
        typeLabel: 'Course',
        durationMinutes: a.read_time_minutes ?? 15,
        topic: topicFromCategory(a.article_category),
        slug: a.article_slug,
        publishedAt: a.published_at,
      };
    });

    return NextResponse.json({ items, fallback: items.length === 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], fallback: true });
  }
}
