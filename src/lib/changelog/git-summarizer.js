import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const GITHUB_API = 'https://api.github.com';

/**
 * Fetch commits from GitHub between two ISO timestamps.
 * Paginates through up to 5 pages (500 commits) — past that, the week
 * has more commits than we can reasonably summarize anyway.
 *
 * @param {string} sinceIso ISO timestamp (inclusive)
 * @param {string} untilIso ISO timestamp (exclusive)
 * @returns {Promise<Array<{sha, message, author, date, url}>>}
 */
export async function fetchCommits(sinceIso, untilIso) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'CRONANANI/cronanani';
  if (!token) throw new Error('GITHUB_TOKEN not set');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const commits = [];
  for (let page = 1; page <= 5; page++) {
    const url = `${GITHUB_API}/repos/${repo}/commits?since=${sinceIso}&until=${untilIso}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[fetchCommits] GitHub API ${res.status} for ${url}: ${body.slice(0, 300)}`);
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const c of batch) {
      commits.push({
        sha: c.sha?.slice(0, 7),
        message: c.commit?.message || '',
        author: c.commit?.author?.name || c.author?.login || 'unknown',
        date: c.commit?.author?.date,
        url: c.html_url,
      });
    }

    if (batch.length < 100) break; // Last page
  }

  return commits;
}

/**
 * Send a week's commits to Claude and get back a structured changelog entry.
 *
 * Returns:
 *   {
 *     title: string,           // Headline for the week
 *     body: string,            // Markdown body summarizing themes
 *     category: string,        // 'feature' | 'improvement' | 'fix' | 'announcement' | 'breaking'
 *   }
 *
 * If the week had zero meaningful commits (only chore/merge), returns null.
 *
 * @param {Array} commits
 * @param {{ start: string, end: string }} weekRange
 */
export async function summarizeCommits(commits, weekRange) {
  if (!commits || commits.length === 0) return null;

  // Filter out noise: merge commits, dependency bumps, formatting-only
  const meaningful = commits.filter((c) => {
    const m = c.message.toLowerCase();
    if (m.startsWith('merge ')) return false;
    if (m.startsWith('chore: bump') || m.startsWith('chore(deps)')) return false;
    if (m.match(/^(fix|chore): formatting/i)) return false;
    return true;
  });

  if (meaningful.length === 0) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });

  const commitList = meaningful
    .map((c) => `- [${c.sha}] ${c.message.split('\n')[0]}`) // First line of each commit message
    .join('\n');

  const weekStart = new Date(weekRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = new Date(weekRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const prompt = `You are summarizing one week of git commits from a personal finance SaaS product (Ezana Finance) into a user-facing changelog entry.

Week: ${weekStart}–${weekEnd}
Total commits: ${meaningful.length}

Commits:
${commitList}

Write a JSON object with these exact keys:
- "title": Short headline (under 60 chars) capturing the WEEK'S theme. Avoid commit-message language. Examples of good titles: "Mock trading and portfolio defaults", "Watchlist polish + new asset icons", "Sign-in dark mode and trending card refresh".
- "body": 2-4 sentences in plain English describing what users will notice or benefit from. Group related commits into themes. NO commit hashes, NO file paths, NO developer jargon. Write FOR users, not for engineers.
- "category": One of "feature" | "improvement" | "fix" | "announcement" | "breaking". Pick based on the dominant theme of the week. Use "improvement" as the default when the week is mixed.

Output ONLY the JSON object. No markdown fencing, no preamble, no explanation.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content?.[0]?.text?.trim() || '';

  // Strip any accidental markdown code fencing
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[git-summarizer] Failed to parse Claude response. Raw:', text.slice(0, 500));
    console.error('[git-summarizer] Cleaned:', cleaned.slice(0, 500));
    console.error('[git-summarizer] Parse error:', e.message);
    return null;
  }

  if (!parsed.title || !parsed.body) return null;

  const VALID_CATEGORIES = ['feature', 'improvement', 'fix', 'announcement', 'breaking'];
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'improvement';

  return {
    title: String(parsed.title).slice(0, 200),
    body: String(parsed.body).slice(0, 5000),
    category,
  };
}

/**
 * Compute the ISO week range (Monday 00:00 UTC → next Monday 00:00 UTC) for a given date.
 *
 * @param {Date} date
 * @returns {{ start: Date, end: Date, weekKey: string }}
 *   weekKey is 'YYYY-Www' format e.g. '2026-W17'
 */
export function getIsoWeekRange(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  // ISO week: Monday is day 1, Sunday is day 7
  const day = d.getUTCDay() || 7; // Treat Sunday as 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));

  const start = new Date(d);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 7);

  // Week number calculation
  const yearStart = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((start - yearStart) / 86400000) + yearStart.getUTCDay() + 1) / 7);
  const weekKey = `${start.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return { start, end, weekKey };
}
