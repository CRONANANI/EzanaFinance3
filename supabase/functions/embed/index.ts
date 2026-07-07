// Supabase Edge Function: embed text with the built-in gte-small model (384-dim).
// No external key needed — runs on Supabase's edge AI runtime. Used server-side
// by the prediction-market matcher (index cron + /api/market-data/related-markets)
// to embed market questions and article text into the same 384-dim vector space.
//
// POST { "input": "some text" } -> { "embedding": number[384] }

// eslint-disable-next-line
const session = new Supabase.ai.Session('gte-small');

Deno.serve(async (req) => {
  try {
    const { input } = await req.json();
    if (typeof input !== 'string' || !input.trim()) {
      return new Response(JSON.stringify({ error: 'input (string) required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const embedding = await session.run(input, { mean_pool: true, normalize: true });
    return new Response(JSON.stringify({ embedding }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
