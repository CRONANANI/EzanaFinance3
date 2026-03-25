import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


// Demo data for search - in production, query Supabase profiles/partners tables
const DEMO_USERS = [
  { id: 'u1', type: 'user', name: 'Aakash Sharma', initials: 'AS', tag: 'Portfolio Tips', bio: 'Active investor, 12 posts' },
  { id: 'u2', type: 'user', name: 'Nidhi Rao', initials: 'NR', tag: 'Congressional Trading', bio: '13F & disclosure enthusiast' },
  { id: 'u3', type: 'user', name: 'Sunita Patil', initials: 'SP', tag: 'Time Management', bio: 'Balancing research & life' },
  { id: 'u4', type: 'user', name: 'Alex Johnson', initials: 'AJ', tag: 'Technology', bio: 'Tech sector analyst' },
  { id: 'u5', type: 'user', name: 'Sarah Chen', initials: 'SC', tag: 'Dividends', bio: 'Dividend income focus' },
  { id: 'u6', type: 'user', name: 'Mike Brown', initials: 'MB', tag: 'Congress', bio: 'Congressional trading alerts' },
  { id: 'u7', type: 'user', name: 'Emma Wilson', initials: 'EW', tag: 'AI Stocks', bio: 'AI sector momentum' },
  { id: 'u8', type: 'user', name: 'Eric Morrison', initials: 'EM', tag: 'Community', bio: '410 day streak' },
  { id: 'u9', type: 'user', name: 'Joseph Morrison', initials: 'JM', tag: 'Community', bio: '328 day streak' },
  { id: 'u10', type: 'user', name: 'David Kim', initials: 'DK', tag: 'Performance', bio: 'Top performer +28.2%' },
  { id: 'u11', type: 'user', name: 'Lisa Park', initials: 'LP', tag: 'Performance', bio: 'Top performer +25.7%' },
  { id: 'u12', type: 'user', name: 'InvestorPro', initials: 'IP', tag: 'Most Active', bio: '45 posts this week' },
];

const DEMO_PARTNERS = [
  { id: 'p1', type: 'partner', name: 'Capital Insights LLC', initials: 'CI', tag: 'Professional Money Manager', bio: 'Institutional-grade research, 15+ years experience' },
  { id: 'p2', type: 'partner', name: 'Market Pulse Media', initials: 'MP', tag: 'Content Creator', bio: 'Daily market analysis & newsletters' },
  { id: 'p3', type: 'partner', name: 'QuantEdge Advisors', initials: 'QE', tag: 'Professional Money Manager', bio: 'Quantitative strategies, systematic approach' },
  { id: 'p4', type: 'partner', name: 'Dividend Digest', initials: 'DD', tag: 'Creator', bio: 'Dividend stock research & income strategies' },
  { id: 'p5', type: 'partner', name: 'Congress Watch Pro', initials: 'CW', tag: 'Partner', bio: 'Congressional trading data & alerts' },
  { id: 'p6', type: 'partner', name: 'TechInvest Academy', initials: 'TI', tag: 'Creator', bio: 'Tech sector education & analysis' },
  { id: 'p7', type: 'partner', name: 'Value Partners Fund', initials: 'VP', tag: 'Professional Money Manager', bio: 'Value investing, long-term focus' },
  { id: 'p8', type: 'partner', name: 'Ezana Research', initials: 'ER', tag: 'Partner', bio: 'Official Ezana market intelligence' },
];

function searchPeople(query, typeFilter) {
  const q = (query || '').toLowerCase().trim();
  const allUsers = DEMO_USERS.map((u) => ({ ...u, searchText: `${u.name} ${u.tag} ${u.bio}`.toLowerCase() }));
  const allPartners = DEMO_PARTNERS.map((p) => ({ ...p, searchText: `${p.name} ${p.tag} ${p.bio}`.toLowerCase() }));

  const matches = (item) => !q || item.searchText.includes(q);

  let users = [];
  let partners = [];

  if (typeFilter === 'all' || typeFilter === 'users') {
    users = allUsers.filter(matches).map(({ searchText, ...rest }) => rest);
  }
  if (typeFilter === 'all' || typeFilter === 'partners') {
    partners = allPartners.filter(matches).map(({ searchText, ...rest }) => rest);
  }

  return { users, partners };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // 'all' | 'users' | 'partners'

    const validTypes = ['all', 'users', 'partners'];
    const typeFilter = validTypes.includes(type) ? type : 'all';

    const { users, partners } = searchPeople(q, typeFilter);

    return NextResponse.json({
      users,
      partners,
      total: users.length + partners.length,
    });
  } catch (error) {
    console.error('Community search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
