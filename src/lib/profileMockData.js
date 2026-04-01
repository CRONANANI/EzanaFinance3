function hashSeed(input) {
  const s = String(input || 'user');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i);
  return Math.abs(h);
}

const TICKERS = ['MSFT', 'AAPL', 'NVDA', 'AMZN', 'META', 'TSLA', 'AMD', 'GOOGL', 'CRM', 'NFLX'];
const TAGS = ['POSITION TAKEN BASED ON BREAKOUT', 'EARNINGS MOMENTUM', 'SWING IDEA', 'REVERSAL SETUP'];
const RISK = ['conservative', 'moderate', 'aggressive', 'degen'];

function pick(arr, i) {
  return arr[i % arr.length];
}

export function generateMockTradesForUser(userKey, count = 7) {
  const seed = hashSeed(userKey);
  const now = Date.now();
  return Array.from({ length: count }).map((_, idx) => {
    const n = seed + idx * 97;
    const ticker = pick(TICKERS, n);
    const isOpen = idx % 3 === 0;
    const pnl = Number((((n % 380) - 140) / 10).toFixed(2));
    const entry = Number((80 + (n % 180) + (n % 100) / 100).toFixed(2));
    const current = Number((entry * (1 + pnl / 100)).toFixed(2));
    const createdAt = new Date(now - (idx + 1) * 36e5 * (5 + (n % 10))).toISOString();
    const expiry = new Date(now + (idx + 10) * 86400000).toISOString().slice(0, 10);
    return {
      id: `mock-${seed}-${idx}`,
      user_id: String(userKey || 'mock'),
      ticker,
      trade_type: 'option',
      expiry_date: expiry,
      strike_price: Number((entry + ((n % 8) - 4) * 2.5).toFixed(2)),
      option_type: n % 2 ? 'call' : 'put',
      entry_price: entry,
      current_price: current,
      exit_price: isOpen ? null : current,
      quantity: 1 + (n % 4),
      status: isOpen ? 'open' : 'closed',
      pnl_percent: pnl,
      pnl_amount: Number(((pnl / 100) * entry * 100).toFixed(2)),
      risk_level: pick(RISK, n),
      risk_reward_ratio: Number((0.45 + (n % 220) / 100).toFixed(2)),
      tags: [pick(TAGS, n)],
      notes: 'Generated mock trade to populate profile cards.',
      opened_at: createdAt,
      updated_at: createdAt,
      created_at: createdAt,
      closed_at: isOpen ? null : createdAt,
    };
  });
}

export function generateMockActivityForUser(userKey) {
  const seed = hashSeed(userKey);
  const now = Date.now();
  const base = [
    { type: 'followed', text: 'Started following a macro trader' },
    { type: 'liked', text: 'Liked a post about NVDA earnings' },
    { type: 'commented', text: 'Commented on a market outlook post' },
    { type: 'posted', text: 'Published a trade thesis update' },
    { type: 'saved', text: 'Bookmarked a top-performing trade idea' },
  ];
  return base.map((b, idx) => ({
    id: `mock-act-${seed}-${idx}`,
    type: b.type,
    text: b.text,
    created_at: new Date(now - (idx + 1) * 86400000).toISOString(),
    isMock: true,
  }));
}
