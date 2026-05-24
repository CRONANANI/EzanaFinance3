import { formatRelativeTime, getInitials, normalizeTickerEmbed } from '@/lib/community-utils';

/** True when content is a discussion post (#discussion tag). */
export function isDiscussionPost(content) {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (/^#discussion\b/i.test(trimmed)) return true;
  return /(?:^|\s)#discussion\b/i.test(content);
}

function minsAgo(iso) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / 60000);
}

function normalizePoll(pollData, myVote, postId) {
  if (!pollData?.options?.length) return null;
  const options = pollData.options.map((o) => ({
    id: o.id,
    label: o.label,
    votes: o.votes || 0,
  }));
  const totalVotes = pollData.total_votes ?? options.reduce((sum, o) => sum + o.votes, 0);
  return { options, totalVotes, myVote: myVote ?? null, postId };
}

function normalizeTickerEmbedForCard(embed) {
  const norm = normalizeTickerEmbed(embed);
  if (!norm?.symbols?.length) return null;
  const first = norm.symbols[0];
  return {
    symbol: first.symbol,
    price: first.highlight_price ?? 0,
    change: 0,
    period: norm.period,
    symbols: norm.symbols,
  };
}

function avatarGradientFromId(id) {
  if (!id) return ['#10b981', '#047857'];
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return [`hsl(${hue}, 55%, 45%)`, `hsl(${(hue + 40) % 360}, 50%, 32%)`];
}

/**
 * Map an API community post row to the PostCard prop shape.
 */
export function normalizePost(p) {
  const author = p.author || {};
  const displayName = (author.display_name || '').trim() || 'Member';
  const content = p.content || '';

  return {
    id: p.id,
    content,
    author: {
      id: author.id,
      display_name: displayName,
      username: author.username || '',
      avatar_url: author.avatar_url || '',
      initials: getInitials(displayName, author.username),
      gradient: avatarGradientFromId(author.id),
    },
    likes: p.likes_count ?? 0,
    comments: p.comments_count ?? 0,
    reposts: p.reposts_count ?? 0,
    liked_by_me: !!p.liked_by_me,
    saved_by_me: !!p.saved_by_me,
    my_conviction: p.my_conviction ?? null,
    avg_conviction: p.avg_conviction ?? null,
    conviction_count: p.conviction_count ?? 0,
    created_at: p.created_at,
    minsAgo: minsAgo(p.created_at),
    timeAgo: formatRelativeTime(p.created_at),
    poll: normalizePoll(p.poll_data, p.my_vote, p.id),
    tickerEmbed: normalizeTickerEmbedForCard(p.ticker_embed),
    image_url: p.image_url ?? null,
    isDiscussion: isDiscussionPost(content),
    skillRating: author.skill_rating ?? author.skillRating ?? null,
    title: p.title ?? null,
    hashtags: p.hashtags ?? null,
    quotedPost: p.quoted_post ?? null,
  };
}
