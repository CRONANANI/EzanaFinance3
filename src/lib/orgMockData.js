// src/lib/orgMockData.js

export const ORG_NAME = 'Ezana Test University Investment Council';
export const ORG_SHORT = 'Ezana Test University';

// ── Sector teams ──
export const MOCK_TEAMS = [
  { id: 't1', name: 'Healthcare', slug: 'healthcare', sector: 'Healthcare' },
  { id: 't2', name: 'Consumer Goods & Services', slug: 'consumer-goods', sector: 'Consumer Goods & Services' },
  { id: 't3', name: 'Energy & Utilities', slug: 'energy-utilities', sector: 'Energy & Utilities' },
  { id: 't4', name: 'Financial Institutions', slug: 'financial-institutions', sector: 'Financial Institutions' },
  { id: 't5', name: 'Industrials', slug: 'industrials', sector: 'Industrials' },
  { id: 't6', name: 'Metals & Mining', slug: 'metals-mining', sector: 'Metals & Mining' },
  { id: 't7', name: 'Technology, Media & Telecom', slug: 'tmt', sector: 'TMT' },
];

// ── Members ──
export const MOCK_MEMBERS = [
  // Executives
  { id: 'm1', name: 'Jordan Nguyen', role: 'executive', sub_role: 'President', team_id: null, email: 'jnguyen@ezanatest.edu', avatar: null },
  { id: 'm2', name: 'Priya Sharma', role: 'executive', sub_role: 'VP of Research', team_id: null, email: 'psharma@ezanatest.edu', avatar: null },
  // Portfolio Managers
  { id: 'm3', name: 'Marcus Chen', role: 'portfolio_manager', sub_role: 'Senior PM', team_id: 't7', email: 'mchen@ezanatest.edu', avatar: null },
  { id: 'm4', name: 'Aisha Patel', role: 'portfolio_manager', sub_role: 'PM', team_id: 't1', email: 'apatel@ezanatest.edu', avatar: null },
  { id: 'm5', name: 'Dylan Brooks', role: 'portfolio_manager', sub_role: 'PM', team_id: 't3', email: 'dbrooks@ezanatest.edu', avatar: null },
  { id: 'm6', name: 'Sofia Rodriguez', role: 'portfolio_manager', sub_role: 'PM', team_id: 't4', email: 'srodriguez@ezanatest.edu', avatar: null },
  { id: 'm7', name: 'Ethan Kim', role: 'portfolio_manager', sub_role: 'PM', team_id: 't2', email: 'ekim@ezanatest.edu', avatar: null },
  { id: 'm8', name: 'Zara Washington', role: 'portfolio_manager', sub_role: 'Junior PM', team_id: 't5', email: 'zwashington@ezanatest.edu', avatar: null },
  { id: 'm9', name: 'Oliver Tanaka', role: 'portfolio_manager', sub_role: 'PM', team_id: 't6', email: 'otanaka@ezanatest.edu', avatar: null },
  // Analysts — TMT
  { id: 'm10', name: 'Emma Liu', role: 'analyst', sub_role: 'Senior Analyst', team_id: 't7', email: 'eliu@ezanatest.edu', avatar: null },
  { id: 'm11', name: 'Noah Garcia', role: 'analyst', sub_role: 'Analyst', team_id: 't7', email: 'ngarcia@ezanatest.edu', avatar: null },
  { id: 'm12', name: 'Chloe Martin', role: 'analyst', sub_role: 'Junior Analyst', team_id: 't7', email: 'cmartin@ezanatest.edu', avatar: null },
  // Analysts — Healthcare
  { id: 'm13', name: 'Liam Foster', role: 'analyst', sub_role: 'Senior Analyst', team_id: 't1', email: 'lfoster@ezanatest.edu', avatar: null },
  { id: 'm14', name: 'Ava Bennett', role: 'analyst', sub_role: 'Analyst', team_id: 't1', email: 'abennett@ezanatest.edu', avatar: null },
  // Analysts — Energy
  { id: 'm15', name: 'Jackson Wright', role: 'analyst', sub_role: 'Analyst', team_id: 't3', email: 'jwright@ezanatest.edu', avatar: null },
  // Analysts — Financial Institutions
  { id: 'm16', name: 'Isabella Torres', role: 'analyst', sub_role: 'Quantitative Analyst', team_id: 't4', email: 'itorres@ezanatest.edu', avatar: null },
  // Analysts — Consumer Goods
  { id: 'm17', name: 'Lucas Adams', role: 'analyst', sub_role: 'Analyst', team_id: 't2', email: 'ladams@ezanatest.edu', avatar: null },
  // Analysts — Industrials
  { id: 'm18', name: 'Mia Thompson', role: 'analyst', sub_role: 'Junior Analyst', team_id: 't5', email: 'mthompson@ezanatest.edu', avatar: null },
  // Analysts — Metals & Mining
  { id: 'm19', name: 'Ryan Park', role: 'analyst', sub_role: 'Analyst', team_id: 't6', email: 'rpark@ezanatest.edu', avatar: null },
];

// ── Events ──
export const MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'TMT Sector Stock Pitch',
    type: 'presentation',
    team_id: 't7',
    team_name: 'Technology, Media & Telecom',
    date: '2026-04-14T14:00:00Z',
    deadline: '2026-04-12T23:59:00Z',
    created_by: 'm1',
    description: 'The TMT team will present their Q2 stock pitch to the executive board. All deliverables must be uploaded by the deadline.',
    deliverables: [
      { name: 'Stock Pitch PowerPoint', type: 'pptx', status: 'uploaded', uploaded_by: 'm3' },
      { name: 'Valuation Model (Excel)', type: 'xlsx', status: 'pending', assigned_to: 'm10' },
      { name: 'One-Page Primer', type: 'pdf', status: 'in_progress', assigned_to: 'm11' },
    ],
    status: 'upcoming',
  },
  {
    id: 'e2',
    title: 'Healthcare Portfolio Review',
    type: 'review',
    team_id: 't1',
    team_name: 'Healthcare',
    date: '2026-04-18T10:00:00Z',
    deadline: '2026-04-16T23:59:00Z',
    created_by: 'm1',
    description: 'Quarterly review of Healthcare team holdings and performance.',
    deliverables: [
      { name: 'Portfolio Summary Deck', type: 'pptx', status: 'pending', assigned_to: 'm4' },
      { name: 'Sector Analysis Report', type: 'pdf', status: 'pending', assigned_to: 'm13' },
    ],
    status: 'upcoming',
  },
  {
    id: 'e3',
    title: 'Energy & Utilities Sector Deep Dive',
    type: 'presentation',
    team_id: 't3',
    team_name: 'Energy & Utilities',
    date: '2026-04-21T15:00:00Z',
    deadline: '2026-04-19T23:59:00Z',
    created_by: 'm2',
    description: 'Energy team presents macro thesis and individual stock picks.',
    deliverables: [
      { name: 'Presentation Deck', type: 'pptx', status: 'pending', assigned_to: 'm5' },
      { name: 'DCF Models', type: 'xlsx', status: 'pending', assigned_to: 'm15' },
    ],
    status: 'upcoming',
  },
  {
    id: 'e4',
    title: 'Council-Wide All Hands',
    type: 'meeting',
    team_id: null,
    team_name: 'All Teams',
    date: '2026-04-25T17:00:00Z',
    deadline: null,
    created_by: 'm1',
    description: 'Monthly all-hands meeting for the entire investment council.',
    deliverables: [],
    status: 'upcoming',
  },
  {
    id: 'e5',
    title: 'Financial Institutions Stock Pitch',
    type: 'presentation',
    team_id: 't4',
    team_name: 'Financial Institutions',
    date: '2026-04-28T14:00:00Z',
    deadline: '2026-04-26T23:59:00Z',
    created_by: 'm2',
    description: 'FIG team presents new coverage initiation.',
    deliverables: [
      { name: 'Pitch Deck', type: 'pptx', status: 'pending', assigned_to: 'm6' },
      { name: 'Comparable Analysis', type: 'xlsx', status: 'pending', assigned_to: 'm16' },
      { name: 'Investment Memo', type: 'pdf', status: 'pending', assigned_to: 'm16' },
    ],
    status: 'upcoming',
  },
];

// ── Tasks ──
export const MOCK_TASKS = [
  { id: 'tk1', title: 'Build NVDA DCF model', team_id: 't7', assigned_to: 'm10', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-12', event_id: 'e1' },
  { id: 'tk2', title: 'Write one-page primer for MSFT', team_id: 't7', assigned_to: 'm11', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-12', event_id: 'e1' },
  { id: 'tk3', title: 'Research AAPL supply chain risks', team_id: 't7', assigned_to: 'm12', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-11', event_id: 'e1' },
  { id: 'tk4', title: 'Update TMT sector watchlist', team_id: 't7', assigned_to: 'm11', assigned_by: 'm3', status: 'completed', priority: 'low', due_date: '2026-04-08', event_id: null },
  { id: 'tk5', title: 'Analyze UNH earnings report', team_id: 't1', assigned_to: 'm13', assigned_by: 'm4', status: 'in_progress', priority: 'high', due_date: '2026-04-16', event_id: 'e2' },
  { id: 'tk6', title: 'Draft sector analysis report', team_id: 't1', assigned_to: 'm14', assigned_by: 'm4', status: 'pending', priority: 'high', due_date: '2026-04-15', event_id: 'e2' },
  { id: 'tk7', title: 'Build XOM DCF model', team_id: 't3', assigned_to: 'm15', assigned_by: 'm5', status: 'pending', priority: 'high', due_date: '2026-04-19', event_id: 'e3' },
  { id: 'tk8', title: 'Run comparable analysis for JPM/GS/MS', team_id: 't4', assigned_to: 'm16', assigned_by: 'm6', status: 'pending', priority: 'high', due_date: '2026-04-26', event_id: 'e5' },
];

// ── Team discussions ──
export const MOCK_DISCUSSIONS = [
  { id: 'd1', team_id: 't7', author: 'm3', author_name: 'Marcus Chen', content: 'Updated the NVDA thesis — added AI data center TAM estimates. Please review before the pitch.', time: '2h ago', replies: 3, type: 'update' },
  { id: 'd2', team_id: 't7', author: 'm10', author_name: 'Emma Liu', content: 'Does anyone have access to the latest Gartner semiconductor forecast? Need it for the valuation model.', time: '5h ago', replies: 1, type: 'question' },
  { id: 'd3', team_id: 't1', author: 'm4', author_name: 'Aisha Patel', content: 'Reminder: Healthcare portfolio review deliverables are due April 16. Please track progress in the event page.', time: '1d ago', replies: 2, type: 'announcement' },
  { id: 'd4', team_id: 't3', author: 'm5', author_name: 'Dylan Brooks', content: 'Interesting read on the IRA impact on clean energy — sharing with the team.', time: '1d ago', replies: 5, type: 'discussion' },
  { id: 'd5', team_id: null, author: 'm1', author_name: 'Jordan Nguyen', content: 'Great work everyone on last week\'s presentations. Executive review notes will be shared by EOD.', time: '3d ago', replies: 8, type: 'announcement' },
  { id: 'd6', team_id: 't4', author: 'm16', author_name: 'Isabella Torres', content: 'The JPM comparable model is ready for review. I used a PB/ROE regression — let me know if you want to discuss.', time: '4h ago', replies: 2, type: 'update' },
  { id: 'd7', team_id: 't7', author: 'm12', author_name: 'Chloe Martin', content: 'Working through AAPL supply chain analysis. Found some interesting data on India manufacturing shift.', time: '6h ago', replies: 0, type: 'update' },
];

// ── Team portfolio mock data (performance) ──
export const MOCK_TEAM_PERFORMANCE = [
  { team_id: 't1', team_name: 'Healthcare', value: 142500, change_pct: 1.8, change_dollar: 2520, top_holdings: ['UNH', 'JNJ', 'PFE', 'ABBV'], ytd_return: 8.4 },
  { team_id: 't2', team_name: 'Consumer Goods & Services', value: 118300, change_pct: -0.4, change_dollar: -475, top_holdings: ['PG', 'KO', 'NKE', 'COST'], ytd_return: 3.2 },
  { team_id: 't3', team_name: 'Energy & Utilities', value: 97800, change_pct: 2.1, change_dollar: 2015, top_holdings: ['XOM', 'CVX', 'NEE', 'SLB'], ytd_return: 12.6 },
  { team_id: 't4', team_name: 'Financial Institutions', value: 135600, change_pct: 0.9, change_dollar: 1215, top_holdings: ['JPM', 'GS', 'MS', 'BAC'], ytd_return: 6.8 },
  { team_id: 't5', team_name: 'Industrials', value: 89400, change_pct: -1.2, change_dollar: -1088, top_holdings: ['CAT', 'HON', 'UNP', 'GE'], ytd_return: 2.1 },
  { team_id: 't6', team_name: 'Metals & Mining', value: 64200, change_pct: 3.4, change_dollar: 2110, top_holdings: ['NEM', 'FCX', 'BHP', 'RIO'], ytd_return: 18.9 },
  { team_id: 't7', team_name: 'Technology, Media & Telecom', value: 198700, change_pct: 1.5, change_dollar: 2935, top_holdings: ['NVDA', 'AAPL', 'MSFT', 'META'], ytd_return: 14.2 },
];

// ── Permission tiers ──
export const PERMISSION_TIERS = {
  executive: {
    label: 'Executive',
    sub_roles: ['President', 'VP of Research', 'VP of Operations', 'Treasurer', 'Secretary'],
    permissions: ['manage_members', 'manage_events', 'manage_permissions', 'view_all_teams', 'create_events', 'upload_deliverables', 'manage_tasks', 'view_analytics', 'manage_org_settings'],
  },
  portfolio_manager: {
    label: 'Portfolio Manager',
    sub_roles: ['Senior PM', 'PM', 'Junior PM'],
    permissions: {
      'Senior PM': ['manage_team_tasks', 'upload_deliverables', 'create_events', 'view_team_analytics', 'manage_analysts', 'approve_deliverables'],
      PM: ['manage_team_tasks', 'upload_deliverables', 'view_team_analytics', 'manage_analysts'],
      'Junior PM': ['manage_team_tasks', 'upload_deliverables', 'view_team_analytics'],
    },
  },
  analyst: {
    label: 'Analyst',
    sub_roles: ['Senior Analyst', 'Analyst', 'Junior Analyst', 'Quantitative Analyst'],
    permissions: {
      'Senior Analyst': ['upload_deliverables', 'view_team_analytics', 'create_posts', 'mentor_juniors'],
      Analyst: ['upload_deliverables', 'view_team_analytics', 'create_posts'],
      'Junior Analyst': ['upload_deliverables', 'create_posts'],
      'Quantitative Analyst': ['upload_deliverables', 'view_team_analytics', 'create_posts', 'run_models'],
    },
  },
};

export function getMembersByTeam(teamId) {
  return MOCK_MEMBERS.filter((m) => m.team_id === teamId);
}

export function getEventsForTeam(teamId) {
  if (!teamId) return MOCK_EVENTS;
  return MOCK_EVENTS.filter((e) => e.team_id === teamId || e.team_id === null);
}

export function getTasksForMember(memberId) {
  return MOCK_TASKS.filter((t) => t.assigned_to === memberId);
}

export function getTasksAssignedBy(memberId) {
  return MOCK_TASKS.filter((t) => t.assigned_by === memberId);
}

export function getTotalPortfolioValue() {
  return MOCK_TEAM_PERFORMANCE.reduce((sum, t) => sum + t.value, 0);
}
