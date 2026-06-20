/**
 * Tool implementations for the Reddit Auto-Poster Agent.
 * Called by Claude via the Agent SDK's tool-calling interface.
 */

import { getAdminClient } from '@/lib/supabase';
import { getArticleBySlug } from '@/lib/echo-data';

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';
const ECHO_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

let cachedToken = null;
let tokenExpiresAt = 0;

/* ─── Reddit OAuth (password grant for personal script app) ───────── */

export async function getRedditAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  const userAgent = process.env.REDDIT_USER_AGENT || 'ezana-finance-bot/1.0';

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Reddit credentials not configured in env vars');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'password', username, password });

  const res = await fetch(REDDIT_AUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reddit auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/* ─── Tool: load a specific article + active subreddits ────────────── */

export async function loadArticleAndTargets({ articleId }) {
  if (!articleId) throw new Error('articleId is required');

  const article = await getArticleBySlug(articleId);
  if (!article) {
    return { error: `Article '${articleId}' not found` };
  }

  const admin = getAdminClient();

  const { data: subs, error: subsErr } = await admin
    .from('reddit_subreddit_config')
    .select('subreddit, voice_description, flair_id, flair_text, submission_type, notes')
    .eq('is_active', true);

  if (subsErr) throw new Error(`Failed to load subreddit config: ${subsErr.message}`);
  if (!subs || subs.length === 0) {
    return { article: null, targetSubreddits: [], message: 'No active subreddits configured' };
  }

  const { data: alreadyPosted, error: logErr } = await admin
    .from('reddit_post_log')
    .select('subreddit')
    .eq('article_id', articleId);

  if (logErr) throw new Error(`Failed to check post log: ${logErr.message}`);

  const postedSet = new Set((alreadyPosted || []).map((r) => r.subreddit));
  const pendingSubs = subs.filter((s) => !postedSet.has(s.subreddit));

  return {
    article: {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      tickers: article.tickers,
      url: `${ECHO_BASE_URL}/ezana-echo/${article.id}`,
      publishedAt: article.publishedAt,
    },
    targetSubreddits: pendingSubs,
    skippedSubreddits: subs.filter((s) => postedSet.has(s.subreddit)).map((s) => s.subreddit),
  };
}

/* ─── Tool: submit a post to Reddit ────────────────────────────────── */

export async function submitRedditPost({ subreddit, title, url, body, submissionType, flairId }) {
  if (!subreddit || !title) throw new Error('subreddit and title are required');

  const token = await getRedditAccessToken();
  const userAgent = process.env.REDDIT_USER_AGENT || 'ezana-finance-bot/1.0';

  const params = new URLSearchParams({
    sr: subreddit,
    title: title.slice(0, 300),
    api_type: 'json',
    sendreplies: 'false',
    resubmit: 'false',
  });

  if (submissionType === 'self') {
    params.set('kind', 'self');
    params.set('text', body || '');
  } else {
    params.set('kind', 'link');
    params.set('url', url);
  }

  if (flairId) params.set('flair_id', flairId);

  const res = await fetch(`${REDDIT_API_BASE}/api/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { success: false, error: `Reddit API HTTP ${res.status}: ${JSON.stringify(data)}` };
  }

  if (data?.json?.errors?.length > 0) {
    return { success: false, error: `Reddit rejected: ${JSON.stringify(data.json.errors)}` };
  }

  const submission = data?.json?.data;
  return {
    success: true,
    redditPostId: submission?.id,
    redditPostUrl: submission?.url,
    redditPostName: submission?.name,
  };
}

/* ─── Tool: log post result for idempotency + audit ─────────────────── */

export async function logRedditPost({
  articleId,
  articleTitle,
  subreddit,
  status,
  caption,
  redditPostId,
  redditPostUrl,
  errorMessage,
}) {
  const admin = getAdminClient();
  const { error } = await admin.from('reddit_post_log').insert({
    article_id: articleId,
    article_title: articleTitle,
    subreddit,
    status,
    caption,
    reddit_post_id: redditPostId,
    reddit_post_url: redditPostUrl,
    error_message: errorMessage,
  });
  if (error) {
    console.error('[reddit-poster] Log failure:', error.message);
    return { logged: false, error: error.message };
  }
  return { logged: true };
}
