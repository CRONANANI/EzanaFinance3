/**
 * Reddit Auto-Poster Agent — manual trigger version.
 *
 * Run with: runRedditPosterAgent({ articleId, dryRun })
 *
 * The agent loop:
 *   1. Calls load_article_and_targets to fetch the article + active subs
 *   2. For each pending subreddit, generates a caption + submits
 *   3. Logs every result for idempotency
 *   4. Returns summary
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadArticleAndTargets, submitRedditPost, logRedditPost } from './reddit-poster-tools';

const MODEL = 'claude-opus-4-7';
const MAX_ITERATIONS = 20;
const MAX_TOKENS = 4096;

const TOOLS = [
  {
    name: 'load_article_and_targets',
    description:
      'Load the article being posted along with the list of active subreddits that have NOT yet received this article. Call this FIRST.',
    input_schema: {
      type: 'object',
      properties: {
        article_id: { type: 'string', description: 'The Echo article slug/id' },
      },
      required: ['article_id'],
    },
  },
  {
    name: 'submit_reddit_post',
    description:
      'Submit a post to one subreddit. Returns success status and the Reddit URL if posted. Call this AFTER you have written the caption.',
    input_schema: {
      type: 'object',
      properties: {
        subreddit: { type: 'string', description: 'Subreddit name without r/ prefix' },
        title: { type: 'string', description: 'Post title (the caption), max 300 chars' },
        url: { type: 'string', description: 'Article URL (used for link submissions)' },
        body: { type: 'string', description: 'For self-posts: body text. Must end with the URL.' },
        submission_type: { type: 'string', enum: ['link', 'self'] },
        flair_id: { type: 'string', description: 'Optional flair UUID' },
      },
      required: ['subreddit', 'title', 'url', 'submission_type'],
    },
  },
  {
    name: 'log_reddit_post',
    description:
      'Record the outcome of a post attempt in the database. Call this AFTER every submit_reddit_post, whether it succeeded or failed.',
    input_schema: {
      type: 'object',
      properties: {
        article_id: { type: 'string' },
        article_title: { type: 'string' },
        subreddit: { type: 'string' },
        status: { type: 'string', enum: ['posted', 'failed', 'skipped'] },
        caption: { type: 'string' },
        reddit_post_id: { type: 'string' },
        reddit_post_url: { type: 'string' },
        error_message: { type: 'string' },
      },
      required: ['article_id', 'article_title', 'subreddit', 'status'],
    },
  },
];

const SYSTEM_PROMPT = `You are the Ezana Finance Reddit posting agent. You take a single newly-published Ezana Echo article and submit it to a list of pre-approved subreddits.

Workflow:
1. Call load_article_and_targets with the article_id provided in the user message.
2. For each subreddit in targetSubreddits, generate a caption that fits that subreddit's voice (provided in voice_description). DO NOT post the same caption to multiple subs.
3. Call submit_reddit_post with that caption.
4. Immediately call log_reddit_post to record the outcome.
5. Move to the next subreddit. Continue until all targets are handled.

Caption rules:
- Title under 300 characters (Reddit truncates).
- Lead with the data point, finding, or angle — not "Check out our article" or "New from Ezana Finance" or any promotional framing.
- Adapt voice per subreddit. r/investing wants dry/data-driven. r/wallstreetbets wants punchy/irreverent. r/SecurityAnalysis wants academic.
- Never use emojis unless voice_description explicitly says it.
- Never include marketing language ("must read", "you won't believe", "game-changing").
- The caption IS the title. There is no separate caption.

For self-posts (submission_type=self):
- Write a 2-3 sentence body summarizing the article's key finding.
- End body with: "Full analysis: [URL]"
- Stay neutral, third-person. Do not write "we found..." or "our analysis shows..."

Safety:
- If submit_reddit_post returns success=false, log the failure and move to the next subreddit. DO NOT retry the same subreddit.
- If targetSubreddits is empty, just log a message and stop.

When done, summarize: how many posted, how many failed, what failed and why.`;

async function executeTool(name, input) {
  try {
    if (name === 'load_article_and_targets') {
      return await loadArticleAndTargets({ articleId: input.article_id });
    }
    if (name === 'submit_reddit_post') {
      return await submitRedditPost({
        subreddit: input.subreddit,
        title: input.title,
        url: input.url,
        body: input.body,
        submissionType: input.submission_type,
        flairId: input.flair_id,
      });
    }
    if (name === 'log_reddit_post') {
      return await logRedditPost({
        articleId: input.article_id,
        articleTitle: input.article_title,
        subreddit: input.subreddit,
        status: input.status,
        caption: input.caption,
        redditPostId: input.reddit_post_id,
        redditPostUrl: input.reddit_post_url,
        errorMessage: input.error_message,
      });
    }
    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: err?.message || 'Tool execution failed' };
  }
}

/**
 * Run the agent for ONE article.
 *
 * @param {string} articleId - The Echo article slug
 * @param {boolean} dryRun - If true, generate captions but don't actually submit to Reddit
 */
export async function runRedditPosterAgent({ articleId, dryRun = false } = {}) {
  if (!articleId) return { success: false, error: 'articleId is required' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { success: false, error: 'ANTHROPIC_API_KEY not configured' };

  const client = new Anthropic({ apiKey });
  const messages = [
    {
      role: 'user',
      content: dryRun
        ? `DRY RUN — article_id="${articleId}". Load the article and target subreddits, generate the caption you WOULD post for each, but do NOT actually call submit_reddit_post. Describe each caption in your final summary.`
        : `New article published. article_id="${articleId}". Post to every pending subreddit. Start by loading the article and targets.`,
    },
  ];

  const summary = {
    articleId,
    iterations: 0,
    posted: 0,
    failed: 0,
    skipped: 0,
    captions: [],
    errors: [],
  };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    summary.iterations++;

    let response;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      summary.errors.push(`Claude API call failed: ${err?.message}`);
      break;
    }

    messages.push({ role: 'assistant', content: response.content });

    if (
      response.stop_reason === 'end_turn' ||
      !response.content.some((b) => b.type === 'tool_use')
    ) {
      summary.finalMessage = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      break;
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      if (block.name === 'submit_reddit_post') {
        summary.captions.push({
          subreddit: block.input.subreddit,
          title: block.input.title,
          submission_type: block.input.submission_type,
        });
      }

      if (block.name === 'log_reddit_post') {
        if (block.input.status === 'posted') summary.posted++;
        else if (block.input.status === 'failed') summary.failed++;
        else if (block.input.status === 'skipped') summary.skipped++;
      }

      let result;
      if (dryRun && block.name === 'submit_reddit_post') {
        result = {
          success: true,
          redditPostId: 'dry_run_fake',
          redditPostUrl: `https://reddit.com/r/${block.input.subreddit}/dryrun`,
          _dryRun: true,
        };
      } else {
        result = await executeTool(block.name, block.input);
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    if (toolResults.length === 0) break;
    messages.push({ role: 'user', content: toolResults });
  }

  if (summary.iterations >= MAX_ITERATIONS) {
    summary.errors.push('Hit max iterations — some posts may not have been processed');
  }

  return { success: true, ...summary };
}
