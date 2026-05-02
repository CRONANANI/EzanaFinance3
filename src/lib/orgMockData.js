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
  // ═══ Executives ═══
  { id: 'm1', name: 'Jordan Nguyen', role: 'executive', sub_role: 'President', team_id: null, email: 'jnguyen@ezanatest.edu', avatar: null },
  { id: 'm2', name: 'Priya Sharma', role: 'executive', sub_role: 'VP of Research', team_id: null, email: 'psharma@ezanatest.edu', avatar: null },
  // Noah — real test account mapped to executive role
  { id: 'm25', name: 'Noah Raymond-Leigh', role: 'executive', sub_role: 'VP of Operations', team_id: null, email: 'noah@raymondleigh.com', avatar: null },

  // ═══ Portfolio Managers ═══
  { id: 'm3', name: 'Marcus Chen', role: 'portfolio_manager', sub_role: 'Senior PM', team_id: 't7', email: 'mchen@ezanatest.edu', avatar: null },
  { id: 'm4', name: 'Aisha Patel', role: 'portfolio_manager', sub_role: 'PM', team_id: 't1', email: 'apatel@ezanatest.edu', avatar: null },
  { id: 'm5', name: 'Dylan Brooks', role: 'portfolio_manager', sub_role: 'PM', team_id: 't3', email: 'dbrooks@ezanatest.edu', avatar: null },
  { id: 'm6', name: 'Sofia Rodriguez', role: 'portfolio_manager', sub_role: 'PM', team_id: 't4', email: 'srodriguez@ezanatest.edu', avatar: null },
  { id: 'm7', name: 'Ethan Kim', role: 'portfolio_manager', sub_role: 'PM', team_id: 't2', email: 'ekim@ezanatest.edu', avatar: null },
  { id: 'm8', name: 'Zara Washington', role: 'portfolio_manager', sub_role: 'Junior PM', team_id: 't5', email: 'zwashington@ezanatest.edu', avatar: null },
  { id: 'm9', name: 'Oliver Tanaka', role: 'portfolio_manager', sub_role: 'PM', team_id: 't6', email: 'otanaka@ezanatest.edu', avatar: null },

  // ═══ Analysts — TMT (expanded) ═══
  { id: 'm10', name: 'Emma Liu', role: 'analyst', sub_role: 'Senior Analyst', team_id: 't7', email: 'eliu@ezanatest.edu', avatar: null },
  { id: 'm11', name: 'Noah Garcia', role: 'analyst', sub_role: 'Analyst', team_id: 't7', email: 'ngarcia@ezanatest.edu', avatar: null },
  { id: 'm12', name: 'Chloe Martin', role: 'analyst', sub_role: 'Junior Analyst', team_id: 't7', email: 'cmartin@ezanatest.edu', avatar: null },
  // Blackberry — real test account mapped to analyst on TMT
  { id: 'm20', name: 'Blackberry Analyst', role: 'analyst', sub_role: 'Analyst', team_id: 't7', email: 'blackberry4567712@gmail.com', avatar: null },
  { id: 'm21', name: 'Raj Venkatesh', role: 'analyst', sub_role: 'Senior Analyst', team_id: 't7', email: 'rvenkatesh@ezanatest.edu', avatar: null },
  { id: 'm22', name: 'Sophia Nakamura', role: 'analyst', sub_role: 'Quantitative Analyst', team_id: 't7', email: 'snakamura@ezanatest.edu', avatar: null },
  { id: 'm23', name: 'Amir Hassan', role: 'analyst', sub_role: 'Junior Analyst', team_id: 't7', email: 'ahassan@ezanatest.edu', avatar: null },
  { id: 'm24', name: 'Lily Tran', role: 'analyst', sub_role: 'Analyst', team_id: 't7', email: 'ltran@ezanatest.edu', avatar: null },

  // ═══ Analysts — Healthcare ═══
  { id: 'm13', name: 'Liam Foster', role: 'analyst', sub_role: 'Senior Analyst', team_id: 't1', email: 'lfoster@ezanatest.edu', avatar: null },
  { id: 'm14', name: 'Ava Bennett', role: 'analyst', sub_role: 'Analyst', team_id: 't1', email: 'abennett@ezanatest.edu', avatar: null },
  // ═══ Analysts — Energy ═══
  { id: 'm15', name: 'Jackson Wright', role: 'analyst', sub_role: 'Analyst', team_id: 't3', email: 'jwright@ezanatest.edu', avatar: null },
  // ═══ Analysts — Financial Institutions ═══
  { id: 'm16', name: 'Isabella Torres', role: 'analyst', sub_role: 'Quantitative Analyst', team_id: 't4', email: 'itorres@ezanatest.edu', avatar: null },
  // ═══ Analysts — Consumer Goods ═══
  { id: 'm17', name: 'Lucas Adams', role: 'analyst', sub_role: 'Analyst', team_id: 't2', email: 'ladams@ezanatest.edu', avatar: null },
  // ═══ Analysts — Industrials ═══
  { id: 'm18', name: 'Mia Thompson', role: 'analyst', sub_role: 'Junior Analyst', team_id: 't5', email: 'mthompson@ezanatest.edu', avatar: null },
  // ═══ Analysts — Metals & Mining ═══
  { id: 'm19', name: 'Ryan Park', role: 'analyst', sub_role: 'Analyst', team_id: 't6', email: 'rpark@ezanatest.edu', avatar: null },
];

// ── Events (expanded with more TMT events) ──
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
    description: 'The TMT team will present their Q2 stock pitch to the executive board.',
    deliverables: [
      { name: 'Stock Pitch PowerPoint', type: 'pptx', status: 'uploaded', uploaded_by: 'm3' },
      { name: 'Valuation Model (Excel)', type: 'xlsx', status: 'pending', assigned_to: 'm10' },
      { name: 'One-Page Primer', type: 'pdf', status: 'in_progress', assigned_to: 'm11' },
      { name: 'Comparable Company Analysis', type: 'xlsx', status: 'pending', assigned_to: 'm22' },
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
  // ─── NEW TMT Events ───
  {
    id: 'e6',
    title: 'TMT Semiconductor Deep Dive',
    type: 'presentation',
    team_id: 't7',
    team_name: 'Technology, Media & Telecom',
    date: '2026-05-05T13:00:00Z',
    deadline: '2026-05-03T23:59:00Z',
    created_by: 'm25',
    description: 'TMT analysts present semiconductor thesis covering NVDA, AMD, AVGO, and TSM with focus on AI infrastructure capex cycle.',
    deliverables: [
      { name: 'Semiconductor Thesis Deck', type: 'pptx', status: 'in_progress', assigned_to: 'm21' },
      { name: 'NVDA DCF Model v2', type: 'xlsx', status: 'in_progress', assigned_to: 'm10' },
      { name: 'AMD Comparable Analysis', type: 'xlsx', status: 'pending', assigned_to: 'm20' },
      { name: 'AVGO Revenue Decomposition', type: 'xlsx', status: 'pending', assigned_to: 'm22' },
    ],
    status: 'upcoming',
  },
  {
    id: 'e7',
    title: 'TMT Media & Streaming Sector Review',
    type: 'review',
    team_id: 't7',
    team_name: 'Technology, Media & Telecom',
    date: '2026-05-12T15:00:00Z',
    deadline: '2026-05-10T23:59:00Z',
    created_by: 'm3',
    description: 'Review of media and streaming holdings — NFLX, DIS, SPOT, PARA — and evaluation of ad revenue trends.',
    deliverables: [
      { name: 'Media Sector Overview', type: 'pdf', status: 'pending', assigned_to: 'm24' },
      { name: 'NFLX Subscriber Model', type: 'xlsx', status: 'pending', assigned_to: 'm20' },
      { name: 'Streaming Comps Table', type: 'xlsx', status: 'pending', assigned_to: 'm23' },
    ],
    status: 'upcoming',
  },
];

// ── Tasks (expanded with more TMT tasks) ──
export const MOCK_TASKS = [
  // Existing tasks
  { id: 'tk1', title: 'Build NVDA DCF model', team_id: 't7', assigned_to: 'm10', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-12', event_id: 'e1' },
  { id: 'tk2', title: 'Write one-page primer for MSFT', team_id: 't7', assigned_to: 'm11', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-12', event_id: 'e1' },
  { id: 'tk3', title: 'Research AAPL supply chain risks', team_id: 't7', assigned_to: 'm12', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-11', event_id: 'e1' },
  { id: 'tk4', title: 'Update TMT sector watchlist', team_id: 't7', assigned_to: 'm11', assigned_by: 'm3', status: 'completed', priority: 'low', due_date: '2026-04-08', event_id: null },
  { id: 'tk5', title: 'Analyze UNH earnings report', team_id: 't1', assigned_to: 'm13', assigned_by: 'm4', status: 'in_progress', priority: 'high', due_date: '2026-04-16', event_id: 'e2' },
  { id: 'tk6', title: 'Draft sector analysis report', team_id: 't1', assigned_to: 'm14', assigned_by: 'm4', status: 'pending', priority: 'high', due_date: '2026-04-15', event_id: 'e2' },
  { id: 'tk7', title: 'Build XOM DCF model', team_id: 't3', assigned_to: 'm15', assigned_by: 'm5', status: 'pending', priority: 'high', due_date: '2026-04-19', event_id: 'e3' },
  { id: 'tk8', title: 'Run comparable analysis for JPM/GS/MS', team_id: 't4', assigned_to: 'm16', assigned_by: 'm6', status: 'pending', priority: 'high', due_date: '2026-04-26', event_id: 'e5' },

  // ─── NEW TMT Tasks ───
  { id: 'tk9', title: 'Build AMD comparable company model', team_id: 't7', assigned_to: 'm20', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-05-03', event_id: 'e6' },
  { id: 'tk10', title: 'Analyze META ad revenue vs GOOGL trends', team_id: 't7', assigned_to: 'm20', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-20', event_id: null },
  { id: 'tk11', title: 'Research AVGO VMware integration synergies', team_id: 't7', assigned_to: 'm22', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-05-03', event_id: 'e6' },
  { id: 'tk12', title: 'Build NFLX subscriber growth model', team_id: 't7', assigned_to: 'm20', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-05-10', event_id: 'e7' },
  { id: 'tk13', title: 'Write TSM one-page primer', team_id: 't7', assigned_to: 'm23', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-05-02', event_id: 'e6' },
  { id: 'tk14', title: 'Update TMT team watchlist with AI infrastructure names', team_id: 't7', assigned_to: 'm24', assigned_by: 'm3', status: 'completed', priority: 'low', due_date: '2026-04-06', event_id: null },
  { id: 'tk15', title: 'Prepare streaming comps table (NFLX, DIS, SPOT, PARA)', team_id: 't7', assigned_to: 'm23', assigned_by: 'm3', status: 'pending', priority: 'high', due_date: '2026-05-10', event_id: 'e7' },
  { id: 'tk16', title: 'Draft semiconductor thesis summary slide', team_id: 't7', assigned_to: 'm21', assigned_by: 'm3', status: 'in_progress', priority: 'urgent', due_date: '2026-05-01', event_id: 'e6' },
];

// ── Enhanced Task Data for All Roles ──
export const EXECUTIVE_TASKS = [
  { id: 'etk1', title: 'Review Q2 budget allocation across all teams', team_id: null, assigned_to: 'm1', assigned_by: null, status: 'in_progress', priority: 'urgent', due_date: '2026-04-10', category: 'strategic' },
  { id: 'etk2', title: 'Approve Healthcare team stock pitch presentation', team_id: 't1', assigned_to: 'm1', assigned_by: 'm4', status: 'pending', priority: 'high', due_date: '2026-04-12', category: 'oversight' },
  { id: 'etk3', title: 'Prepare board of directors quarterly report', team_id: null, assigned_to: 'm2', assigned_by: 'm1', status: 'in_progress', priority: 'high', due_date: '2026-04-15', category: 'reporting' },
  { id: 'etk4', title: 'Interview candidates for Junior PM position (Industrials)', team_id: 't5', assigned_to: 'm25', assigned_by: null, status: 'pending', priority: 'medium', due_date: '2026-04-18', category: 'hiring' },
  { id: 'etk5', title: 'Strategic planning session - FY27 goals', team_id: null, assigned_to: 'm1', assigned_by: null, status: 'pending', priority: 'high', due_date: '2026-04-20', category: 'strategic' },
  { id: 'etk6', title: 'Review and approve TMT semiconductor thesis', team_id: 't7', assigned_to: 'm2', assigned_by: 'm3', status: 'completed', priority: 'high', due_date: '2026-04-05', category: 'oversight' },
  { id: 'etk7', title: 'Evaluate risk management protocols org-wide', team_id: null, assigned_to: 'm25', assigned_by: 'm1', status: 'in_progress', priority: 'medium', due_date: '2026-04-22', category: 'compliance' },
  { id: 'etk8', title: 'Approve portfolio rebalancing recommendations', team_id: null, assigned_to: 'm1', assigned_by: 'm3', status: 'pending', priority: 'high', due_date: '2026-04-14', category: 'investment' },
];

export const PORTFOLIO_MANAGER_TASKS = [
  { id: 'pmtk1', title: "Review Emma Liu's NVDA DCF model v3", team_id: 't7', assigned_to: 'm3', assigned_by: 'm10', status: 'in_progress', priority: 'high', due_date: '2026-04-09', category: 'review' },
  { id: 'pmtk2', title: 'Finalize TMT stock pitch deck for exec presentation', team_id: 't7', assigned_to: 'm3', assigned_by: 'm1', status: 'in_progress', priority: 'urgent', due_date: '2026-04-11', category: 'presentation' },
  { id: 'pmtk3', title: 'One-on-one meetings with all TMT analysts', team_id: 't7', assigned_to: 'm3', assigned_by: null, status: 'in_progress', priority: 'medium', due_date: '2026-04-12', category: 'management' },
  { id: 'pmtk4', title: 'Update TMT portfolio risk metrics for quarterly review', team_id: 't7', assigned_to: 'm3', assigned_by: 'm2', status: 'pending', priority: 'high', due_date: '2026-04-16', category: 'reporting' },
  { id: 'pmtk5', title: 'Assign AMD coverage initiation to analyst', team_id: 't7', assigned_to: 'm3', assigned_by: null, status: 'completed', priority: 'medium', due_date: '2026-04-03', category: 'delegation' },
  { id: 'pmtk6', title: 'Review Healthcare sector macro headwinds analysis', team_id: 't1', assigned_to: 'm4', assigned_by: 'm13', status: 'pending', priority: 'medium', due_date: '2026-04-14', category: 'review' },
  { id: 'pmtk7', title: 'Prepare Energy team weekly sync agenda', team_id: 't3', assigned_to: 'm5', assigned_by: null, status: 'pending', priority: 'low', due_date: '2026-04-10', category: 'management' },
  { id: 'pmtk8', title: 'Review Financial Institutions Q1 performance attribution', team_id: 't4', assigned_to: 'm6', assigned_by: 'm1', status: 'in_progress', priority: 'high', due_date: '2026-04-15', category: 'analysis' },
];

export const ANALYST_TASKS = [
  { id: 'atk1', title: 'Complete NVDA DCF model with sensitivity analysis', team_id: 't7', assigned_to: 'm10', assigned_by: 'm3', status: 'in_progress', priority: 'urgent', due_date: '2026-04-09', category: 'modeling' },
  { id: 'atk2', title: 'Draft one-page MSFT investment thesis summary', team_id: 't7', assigned_to: 'm11', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-10', category: 'research' },
  { id: 'atk3', title: 'Research AAPL India manufacturing expansion impact', team_id: 't7', assigned_to: 'm12', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-11', category: 'research' },
  { id: 'atk4', title: 'Build AMD comparable company analysis model', team_id: 't7', assigned_to: 'm20', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-13', category: 'modeling' },
  { id: 'atk5', title: 'Update META ad revenue forecast model', team_id: 't7', assigned_to: 'm20', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-15', category: 'modeling' },
  { id: 'atk6', title: 'Complete AVGO VMware synergies analysis', team_id: 't7', assigned_to: 'm22', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-12', category: 'research' },
  { id: 'atk7', title: 'Draft TSM geopolitical risk assessment memo', team_id: 't7', assigned_to: 'm23', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-14', category: 'research' },
  { id: 'atk8', title: 'Build NFLX subscriber model with ad tier assumptions', team_id: 't7', assigned_to: 'm20', assigned_by: 'm3', status: 'pending', priority: 'medium', due_date: '2026-04-17', category: 'modeling' },
  { id: 'atk9', title: 'Research CRWD platform consolidation thesis', team_id: 't7', assigned_to: 'm21', assigned_by: 'm3', status: 'in_progress', priority: 'high', due_date: '2026-04-16', category: 'research' },
  { id: 'atk10', title: 'Update TMT coverage universe watchlist', team_id: 't7', assigned_to: 'm24', assigned_by: 'm3', status: 'completed', priority: 'low', due_date: '2026-04-06', category: 'maintenance' },
];

// ── Performance Metrics Mock Data ──
export const PERFORMANCE_METRICS = {
  executive: {
    orgPortfolioValue: 846500,
    orgChange: '+2.3%',
    orgChangeDollar: 19043,
    bestPerformingTeam: 't7',
    worstPerformingTeam: 't5',
    avgTeamReturn: 9.5,
    tasksAssignedThisWeek: 12,
    tasksCompletedThisWeek: 8,
    upcomingPresentations: 3,
  },
  portfolio_manager: {
    t7: {
      portfolioValue: 198700,
      change: '+1.5%',
      changeDollar: 2935,
      ytdReturn: 14.2,
      activePositions: 15,
      analystCount: 8,
      tasksCompleted: 24,
      tasksActive: 11,
    },
    t1: {
      portfolioValue: 142500,
      change: '+1.8%',
      changeDollar: 2520,
      ytdReturn: 8.4,
      activePositions: 12,
      analystCount: 2,
      tasksCompleted: 18,
      tasksActive: 7,
    },
  },
  analyst: {
    m10: {
      stocksCovered: 3,
      activeTasks: 4,
      completedTasks: 12,
      avgTaskCompletionTime: '2.3 days',
      recentDeliverables: 8,
      coverageRating: 'Strong Buy: 2, Hold: 1',
    },
    m20: {
      stocksCovered: 5,
      activeTasks: 6,
      completedTasks: 15,
      avgTaskCompletionTime: '2.8 days',
      recentDeliverables: 11,
      coverageRating: 'Buy: 3, Hold: 2',
    },
  },
};

// ── Strategic Overview Data (Executive-specific) ──
export const STRATEGIC_OVERVIEW = {
  totalAUM: 846500,
  targetAUM: 1000000,
  headcount: 25,
  targetHeadcount: 30,
  avgPortfolioReturn: 9.5,
  benchmarkReturn: 7.2,
  riskAdjustedReturn: 1.32,
  teamUtilization: 87,
  upcomingMilestones: [
    { title: 'Q2 Board Presentation', date: '2026-04-25', owner: 'Jordan Nguyen' },
    { title: 'Summer Analyst Hiring', date: '2026-05-15', owner: 'Noah Raymond-Leigh' },
    { title: 'Portfolio Rebalancing Review', date: '2026-04-30', owner: 'Priya Sharma' },
  ],
};

// ── Coverage Pipeline Data (PM-specific) ──
export const COVERAGE_PIPELINE = {
  t7: [
    { ticker: 'NVDA', analyst: 'Emma Liu', status: 'Active', rating: 'Buy', nextUpdate: '2026-04-15' },
    { ticker: 'AMD', analyst: 'Blackberry Analyst', status: 'Active', rating: 'Buy', nextUpdate: '2026-04-18' },
    { ticker: 'META', analyst: 'Blackberry Analyst', status: 'Active', rating: 'Hold', nextUpdate: '2026-04-20' },
    { ticker: 'AVGO', analyst: 'Sophia Nakamura', status: 'Active', rating: 'Buy', nextUpdate: '2026-04-16' },
    { ticker: 'TSM', analyst: 'Amir Hassan', status: 'Initiating', rating: 'TBD', nextUpdate: '2026-04-25' },
    { ticker: 'CRWD', analyst: 'Raj Venkatesh', status: 'Active', rating: 'Buy', nextUpdate: '2026-04-22' },
  ],
};

// ── Analyst Coverage Data ──
export const ANALYST_COVERAGE = {
  m10: [
    { ticker: 'NVDA', rating: 'Buy', targetPrice: 950, lastUpdated: '2026-04-05', nextEarnings: '2026-05-22' },
    { ticker: 'MSFT', rating: 'Buy', targetPrice: 485, lastUpdated: '2026-03-28', nextEarnings: '2026-04-25' },
    { ticker: 'CRM', rating: 'Hold', targetPrice: 310, lastUpdated: '2026-03-15', nextEarnings: '2026-05-29' },
  ],
  m20: [
    { ticker: 'AMD', rating: 'Buy', targetPrice: 195, lastUpdated: '2026-04-03', nextEarnings: '2026-04-30' },
    { ticker: 'META', rating: 'Hold', targetPrice: 530, lastUpdated: '2026-03-20', nextEarnings: '2026-04-24' },
    { ticker: 'GOOGL', rating: 'Buy', targetPrice: 185, lastUpdated: '2026-03-22', nextEarnings: '2026-04-23' },
    { ticker: 'NFLX', rating: 'Hold', targetPrice: 650, lastUpdated: '2026-03-18', nextEarnings: '2026-04-18' },
  ],
};

// ── Resource Allocation Data (Executive) ──
export const RESOURCE_ALLOCATION = {
  teams: [
    { name: 'TMT', analysts: 8, budget: 285000, budgetUsed: 198700, utilization: 69.7 },
    { name: 'Healthcare', analysts: 2, budget: 180000, budgetUsed: 142500, utilization: 79.2 },
    { name: 'Financial Institutions', analysts: 1, budget: 175000, budgetUsed: 135600, utilization: 77.5 },
    { name: 'Consumer Goods', analysts: 1, budget: 150000, budgetUsed: 118300, utilization: 78.9 },
    { name: 'Energy & Utilities', analysts: 1, budget: 125000, budgetUsed: 97800, utilization: 78.2 },
    { name: 'Industrials', analysts: 1, budget: 115000, budgetUsed: 89400, utilization: 77.7 },
    { name: 'Metals & Mining', analysts: 1, budget: 90000, budgetUsed: 64200, utilization: 71.3 },
  ],
  quarterlyBudget: 1120000,
  quarterlySpend: 846500,
  headcountTarget: 30,
  currentHeadcount: 25,
};

// ── Skill Development (Analyst-specific) ──
export const ANALYST_SKILL_DEVELOPMENT = {
  m10: {
    completedCourses: ['Advanced DCF Modeling', 'Semiconductor Industry Deep Dive', 'Python for Finance'],
    inProgressCourses: ['Machine Learning for Portfolio Management'],
    certifications: ['CFA Level II Candidate'],
    nextMilestone: 'CFA Level II Exam - June 2026',
    skillRatings: { modeling: 95, research: 92, presentation: 88 },
  },
  m20: {
    completedCourses: ['Equity Valuation Fundamentals', 'Digital Advertising Economics'],
    inProgressCourses: ['Advanced Excel for Finance', 'Behavioral Finance'],
    certifications: ['Bloomberg Market Concepts'],
    nextMilestone: 'CFA Level I Exam - August 2026',
    skillRatings: { modeling: 78, research: 85, presentation: 80 },
  },
};

// ── Team discussions (expanded) ──
export const MOCK_DISCUSSIONS = [
  { id: 'd1', team_id: 't7', author: 'm3', author_name: 'Marcus Chen', content: 'Updated the NVDA thesis — added AI data center TAM estimates. Please review before the pitch.', time: '2h ago', replies: 3, type: 'update' },
  { id: 'd2', team_id: 't7', author: 'm10', author_name: 'Emma Liu', content: 'Does anyone have access to the latest Gartner semiconductor forecast? Need it for the valuation model.', time: '5h ago', replies: 1, type: 'question' },
  { id: 'd3', team_id: 't1', author: 'm4', author_name: 'Aisha Patel', content: 'Reminder: Healthcare portfolio review deliverables are due April 16. Please track progress in the event page.', time: '1d ago', replies: 2, type: 'announcement' },
  { id: 'd4', team_id: 't3', author: 'm5', author_name: 'Dylan Brooks', content: 'Interesting read on the IRA impact on clean energy — sharing with the team.', time: '1d ago', replies: 5, type: 'discussion' },
  { id: 'd5', team_id: null, author: 'm1', author_name: 'Jordan Nguyen', content: 'Great work everyone on last week\'s presentations. Executive review notes will be shared by EOD.', time: '3d ago', replies: 8, type: 'announcement' },
  { id: 'd6', team_id: 't4', author: 'm16', author_name: 'Isabella Torres', content: 'The JPM comparable model is ready for review. I used a PB/ROE regression — let me know if you want to discuss.', time: '4h ago', replies: 2, type: 'update' },
  { id: 'd7', team_id: 't7', author: 'm12', author_name: 'Chloe Martin', content: 'Working through AAPL supply chain analysis. Found some interesting data on India manufacturing shift.', time: '6h ago', replies: 0, type: 'update' },

  // ─── NEW TMT Discussions ───
  { id: 'd8', team_id: 't7', author: 'm20', author_name: 'Blackberry Analyst', content: 'Started the AMD comps model — using NVDA, INTC, MRVL, and QCOM as the peer set. Any thoughts on including AVGO?', time: '1h ago', replies: 2, type: 'question' },
  { id: 'd9', team_id: 't7', author: 'm21', author_name: 'Raj Venkatesh', content: 'Semiconductor deep dive slide deck draft is up. I\'ve outlined the AI infrastructure capex thesis — please review and add comments.', time: '3h ago', replies: 4, type: 'update' },
  { id: 'd10', team_id: 't7', author: 'm22', author_name: 'Sophia Nakamura', content: 'Running a sensitivity analysis on AVGO\'s VMware synergies. Initial numbers suggest 15-20% EPS accretion by FY27.', time: '8h ago', replies: 1, type: 'update' },
  { id: 'd11', team_id: 't7', author: 'm24', author_name: 'Lily Tran', content: 'Updated the TMT watchlist — added SMCI, ARM, and CRWD based on last week\'s discussion about AI infrastructure plays.', time: '1d ago', replies: 3, type: 'update' },
  { id: 'd12', team_id: 't7', author: 'm23', author_name: 'Amir Hassan', content: 'Any views on the T-Mobile/Sprint merger synergy realization? Working on a telecom primer and could use some input.', time: '2d ago', replies: 1, type: 'question' },
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

// ── NEW: TMT individual holdings breakdown ──
export const MOCK_TMT_HOLDINGS = [
  { ticker: 'NVDA', shares: 120, avg_cost: 450.25, current_price: 875.30, sector: 'Semiconductors', analyst: 'm10', coverage_status: 'active' },
  { ticker: 'AAPL', shares: 200, avg_cost: 165.10, current_price: 198.45, sector: 'Consumer Tech', analyst: 'm12', coverage_status: 'active' },
  { ticker: 'MSFT', shares: 150, avg_cost: 310.50, current_price: 425.20, sector: 'Enterprise Software', analyst: 'm11', coverage_status: 'active' },
  { ticker: 'META', shares: 85, avg_cost: 290.75, current_price: 510.60, sector: 'Digital Advertising', analyst: 'm20', coverage_status: 'active' },
  { ticker: 'GOOGL', shares: 175, avg_cost: 125.40, current_price: 172.85, sector: 'Digital Advertising', analyst: 'm20', coverage_status: 'active' },
  { ticker: 'AMD', shares: 250, avg_cost: 105.20, current_price: 162.40, sector: 'Semiconductors', analyst: 'm20', coverage_status: 'active' },
  { ticker: 'AVGO', shares: 40, avg_cost: 920.00, current_price: 1345.75, sector: 'Semiconductors', analyst: 'm22', coverage_status: 'active' },
  { ticker: 'TSM', shares: 110, avg_cost: 98.50, current_price: 165.30, sector: 'Semiconductors', analyst: 'm23', coverage_status: 'initiating' },
  { ticker: 'NFLX', shares: 55, avg_cost: 485.60, current_price: 625.80, sector: 'Streaming', analyst: 'm20', coverage_status: 'active' },
  { ticker: 'CRM', shares: 90, avg_cost: 215.30, current_price: 295.10, sector: 'Enterprise Software', analyst: 'm24', coverage_status: 'active' },
  { ticker: 'CRWD', shares: 70, avg_cost: 190.00, current_price: 342.55, sector: 'Cybersecurity', analyst: 'm21', coverage_status: 'active' },
  { ticker: 'NOW', shares: 30, avg_cost: 580.25, current_price: 785.40, sector: 'Enterprise Software', analyst: 'm24', coverage_status: 'active' },
  { ticker: 'SMCI', shares: 65, avg_cost: 310.00, current_price: 680.20, sector: 'AI Infrastructure', analyst: 'm21', coverage_status: 'initiating' },
  { ticker: 'ARM', shares: 100, avg_cost: 72.50, current_price: 148.90, sector: 'Semiconductors', analyst: 'm22', coverage_status: 'initiating' },
];

// ── NEW: TMT research pipeline ──
export const MOCK_TMT_RESEARCH_PIPELINE = [
  { ticker: 'NVDA', analyst_id: 'm10', analyst_name: 'Emma Liu', status: 'active', rating: 'Buy', target_price: 950, thesis: 'AI data center TAM expansion' },
  { ticker: 'AMD', analyst_id: 'm20', analyst_name: 'Blackberry Analyst', status: 'active', rating: 'Buy', target_price: 195, thesis: 'AI GPU market share gains from MI300X' },
  { ticker: 'META', analyst_id: 'm20', analyst_name: 'Blackberry Analyst', status: 'active', rating: 'Hold', target_price: 530, thesis: 'Ad revenue stabilization, Reels monetization' },
  { ticker: 'AVGO', analyst_id: 'm22', analyst_name: 'Sophia Nakamura', status: 'active', rating: 'Buy', target_price: 1500, thesis: 'VMware integration + AI ASIC opportunity' },
  { ticker: 'CRWD', analyst_id: 'm21', analyst_name: 'Raj Venkatesh', status: 'active', rating: 'Buy', target_price: 400, thesis: 'Platform consolidation in cybersecurity' },
  { ticker: 'TSM', analyst_id: 'm23', analyst_name: 'Amir Hassan', status: 'initiating', rating: 'Pending', target_price: null, thesis: 'Advanced node monopoly + geopolitical risk' },
  { ticker: 'NFLX', analyst_id: 'm20', analyst_name: 'Blackberry Analyst', status: 'active', rating: 'Hold', target_price: 650, thesis: 'Ad tier growth, password sharing crackdown' },
  { ticker: 'SMCI', analyst_id: 'm21', analyst_name: 'Raj Venkatesh', status: 'initiating', rating: 'Pending', target_price: null, thesis: 'AI server rack leader, but governance concerns' },
];

// ── Permission tiers ──
export const PERMISSION_TIERS = {
  executive: {
    label: 'Executive',
    sub_roles: ['President', 'VP of Research', 'VP of Operations', 'Treasurer', 'Secretary'],
    permissions: [
      'manage_members',
      'manage_events',
      'manage_permissions',
      'view_all_teams',
      'create_events',
      'upload_deliverables',
      'manage_tasks',
      'view_analytics',
      'manage_org_settings',
      'flag_positions',
      'grant_permissions',
      'send_to_team',
      'manage_subordinate_notifications',
    ],
  },
  portfolio_manager: {
    label: 'Portfolio Manager',
    sub_roles: ['Senior PM', 'PM', 'Junior PM'],
    permissions: {
      'Senior PM': [
        'manage_team_tasks',
        'upload_deliverables',
        'create_events',
        'view_team_analytics',
        'manage_analysts',
        'approve_deliverables',
        'flag_positions',
        'grant_permissions',
        'send_to_team',
        'manage_subordinate_notifications',
      ],
      PM: [
        'manage_team_tasks',
        'upload_deliverables',
        'view_team_analytics',
        'manage_analysts',
        'flag_positions',
        'grant_permissions',
        'send_to_team',
        'manage_subordinate_notifications',
      ],
      'Junior PM': [
        'manage_team_tasks',
        'upload_deliverables',
        'view_team_analytics',
        'flag_positions',
        'send_to_team',
      ],
    },
  },
  analyst: {
    label: 'Analyst',
    sub_roles: ['Senior Analyst', 'Analyst', 'Junior Analyst', 'Quantitative Analyst'],
    permissions: {
      'Senior Analyst': [
        'upload_deliverables',
        'view_team_analytics',
        'create_posts',
        'mentor_juniors',
        'flag_positions',
        'send_to_team',
      ],
      Analyst: ['upload_deliverables', 'view_team_analytics', 'create_posts', 'send_to_team'],
      'Junior Analyst': ['upload_deliverables', 'create_posts'],
      'Quantitative Analyst': [
        'upload_deliverables',
        'view_team_analytics',
        'create_posts',
        'run_models',
        'send_to_team',
      ],
    },
  },
};

// ── Helper functions ──
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

/**
 * Effective permissions: PERMISSION_TIERS defaults plus optional DB overrides (org_member_permissions).
 */
/**
 * Mock hierarchy: who a supervisor can manage notification prefs for (UI / demos).
 * For live DB rows use {@link getManageableOrgPeers}.
 */
export function getManageableMembers(supervisor) {
  if (!supervisor) return [];
  if (supervisor.role === 'executive') {
    return MOCK_MEMBERS.filter((m) => m.role === 'portfolio_manager');
  }
  if (supervisor.role === 'portfolio_manager') {
    return MOCK_MEMBERS.filter(
      (m) => m.role === 'analyst' && m.team_id === supervisor.team_id
    );
  }
  return [];
}

/**
 * Same rules as {@link getManageableMembers}, using real `org_members` rows (UUID ids).
 * @param {{ id: string, role: string, team_id: string | null } | null} supervisor
 * @param {Array<{ id: string, role: string, team_id: string | null }>} orgPeers
 */
export function getManageableOrgPeers(supervisor, orgPeers) {
  if (!supervisor || !orgPeers?.length) return [];
  if (supervisor.role === 'executive') {
    return orgPeers.filter((m) => m.role === 'portfolio_manager' && m.id !== supervisor.id);
  }
  if (supervisor.role === 'portfolio_manager') {
    return orgPeers.filter(
      (m) => m.role === 'analyst' && m.team_id === supervisor.team_id && m.id !== supervisor.id
    );
  }
  return [];
}

export function getMemberPermissions(member, overridePerms = []) {
  if (!member) return [];
  const tier = PERMISSION_TIERS[member.role];
  if (!tier) return [];

  let basePerms = [];
  if (Array.isArray(tier.permissions)) {
    basePerms = [...tier.permissions];
  } else if (tier.permissions && member.sub_role) {
    basePerms = [...(tier.permissions[member.sub_role] || [])];
  }

  const all = new Set([...basePerms, ...overridePerms]);
  return [...all];
}

export function canFlagPositions(member, overridePerms = []) {
  return getMemberPermissions(member, overridePerms).includes('flag_positions');
}

/**
 * Routing: exec → team PM; PM → covering analyst (same team) or first team analyst; analyst → PM.
 * @param {string|null} mockTeamId — MOCK_TEAMS id (t1…t7) for the portfolio being flagged.
 */
export function resolveFlagRecipient(raiser, ticker, mockTeamId) {
  if (!raiser) return null;

  if (raiser.role === 'executive') {
    const team = MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === mockTeamId);
    if (!team) return null;
    const pm = MOCK_MEMBERS.find(
      (m) => m.role === 'portfolio_manager' && m.team_id === team.team_id
    );
    return pm?.id || null;
  }

  if (raiser.role === 'portfolio_manager') {
    const coverage = MOCK_TMT_RESEARCH_PIPELINE.find((r) => r.ticker === ticker);
    if (coverage) {
      const analyst = MOCK_MEMBERS.find((m) => m.id === coverage.analyst_id);
      if (analyst && analyst.team_id === raiser.team_id) return coverage.analyst_id;
    }
    const teamAnalyst = MOCK_MEMBERS.find(
      (m) => m.role === 'analyst' && m.team_id === raiser.team_id
    );
    return teamAnalyst?.id || null;
  }

  if (raiser.role === 'analyst') {
    const pm = MOCK_MEMBERS.find(
      (m) => m.role === 'portfolio_manager' && m.team_id === raiser.team_id
    );
    return pm?.id || null;
  }

  return null;
}

// NEW: look up mock member by their real email
export function getMemberByEmail(email) {
  if (!email) return null;
  return MOCK_MEMBERS.find((m) => m.email.toLowerCase() === email.toLowerCase()) || null;
}

/** Map DB org_teams row (by UUID) to mock team id t1…t7 via slug. */
export function mockTeamIdFromDbTeams(orgTeams, teamUuid) {
  if (!teamUuid || !orgTeams?.length) return null;
  const row = orgTeams.find((t) => t.id === teamUuid);
  return MOCK_TEAMS.find((m) => m.slug === row?.slug)?.id ?? null;
}

export function dbTeamIdFromMockTeamId(orgTeams, mockTeamId) {
  const slug = MOCK_TEAMS.find((t) => t.id === mockTeamId)?.slug;
  if (!slug || !orgTeams?.length) return null;
  return orgTeams.find((t) => t.slug === slug)?.id ?? null;
}

/** Mock top colleague interactions (member id → colleague member ids) — used by hierarchy UI */
export const MOCK_TOP_INTERACTIONS = {
  m1: ['m2', 'm3', 'm4'],
  m2: ['m1', 'm5', 'm6'],
  m25: ['m1', 'm3', 'm7'],
  m3: ['m10', 'm11', 'm12'],
  m10: ['m3', 'm11', 'm22'],
  m11: ['m3', 'm10', 'm12'],
  m12: ['m3', 'm10', 'm11'],
  m20: ['m3', 'm10', 'm22'],
  m21: ['m3', 'm22', 'm10'],
  m22: ['m3', 'm21', 'm20'],
  m23: ['m3', 'm24', 'm12'],
  m24: ['m3', 'm23', 'm11'],
  m4: ['m13', 'm14', 'm1'],
  m5: ['m15', 'm1', 'm2'],
  m6: ['m16', 'm1', 'm2'],
  m7: ['m17', 'm1', 'm2'],
  m8: ['m18', 'm1', 'm2'],
  m9: ['m19', 'm1', 'm2'],
  m13: ['m4', 'm14', 'm1'],
  m14: ['m4', 'm13', 'm1'],
  m15: ['m5', 'm1', 'm2'],
  m16: ['m6', 'm1', 'm2'],
  m17: ['m7', 'm1', 'm2'],
  m18: ['m8', 'm1', 'm2'],
  m19: ['m9', 'm1', 'm2'],
};

export function getOrgMemberReportsTo(member) {
  if (!member) return null;
  if (member.role === 'analyst') {
    return (
      MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === member.team_id) || null
    );
  }
  if (member.role === 'portfolio_manager') {
    return MOCK_MEMBERS.find((m) => m.role === 'executive' && m.sub_role === 'President') || null;
  }
  return null;
}

export function getOrgMemberDirectReports(member) {
  if (!member) return [];
  if (member.role === 'executive') {
    return MOCK_MEMBERS.filter((m) => m.role === 'portfolio_manager');
  }
  if (member.role === 'portfolio_manager') {
    return MOCK_MEMBERS.filter((m) => m.role === 'analyst' && m.team_id === member.team_id);
  }
  return [];
}

export function getOrgMemberTopInteractions(memberId) {
  const ids = MOCK_TOP_INTERACTIONS[memberId] || [];
  return ids
    .map((id) => MOCK_MEMBERS.find((m) => m.id === id))
    .filter(Boolean)
    .slice(0, 3);
}

/** Demo platform activity derived from mock tasks & discussions */
export function getMockMemberActivitySummary(memberId) {
  const myTasks = MOCK_TASKS.filter((t) => t.assigned_to === memberId);
  const delegated = MOCK_TASKS.filter((t) => t.assigned_by === memberId);
  const posts = MOCK_DISCUSSIONS.filter((d) => d.author === memberId);
  const seed = memberId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const learningSessions = 3 + (seed % 12);
  return {
    activeTasks: myTasks.filter((t) => t.status !== 'completed').length,
    completedTasks: myTasks.filter((t) => t.status === 'completed').length,
    tasksDelegated: delegated.length,
    teamPosts: posts.length,
    learningSessions,
    lastActive: ['Just now', '2h ago', 'Today', 'Yesterday', '3d ago'][seed % 5],
  };
}

export function getTasksByRole(role, memberId = null) {
  if (role === 'executive') return EXECUTIVE_TASKS;
  if (role === 'portfolio_manager') {
    if (memberId) {
      return PORTFOLIO_MANAGER_TASKS.filter((t) => t.assigned_to === memberId);
    }
    return PORTFOLIO_MANAGER_TASKS;
  }
  if (role === 'analyst') {
    if (memberId) {
      return ANALYST_TASKS.filter((t) => t.assigned_to === memberId);
    }
    return ANALYST_TASKS;
  }
  return [];
}

export function getPerformanceMetrics(role, memberId = null) {
  if (role === 'executive') return PERFORMANCE_METRICS.executive;
  if (role === 'portfolio_manager') {
    const member = MOCK_MEMBERS.find((m) => m.id === memberId);
    const tid = member?.team_id;
    const direct = tid ? PERFORMANCE_METRICS.portfolio_manager[tid] : null;
    if (direct) return direct;
    const teamPerf = MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === tid);
    if (teamPerf && tid) {
      const analystsOnTeam = getMembersByTeam(tid).filter((m) => m.role === 'analyst').length;
      return {
        portfolioValue: teamPerf.value,
        change: `${teamPerf.change_pct >= 0 ? '+' : ''}${teamPerf.change_pct}%`,
        changeDollar: teamPerf.change_dollar,
        ytdReturn: teamPerf.ytd_return,
        activePositions: 10,
        analystCount: analystsOnTeam || 1,
        tasksCompleted: 12,
        tasksActive: 6,
      };
    }
    return null;
  }
  if (role === 'analyst') {
    if (memberId && PERFORMANCE_METRICS.analyst[memberId]) {
      return PERFORMANCE_METRICS.analyst[memberId];
    }
    return {
      stocksCovered: 2,
      activeTasks: 2,
      completedTasks: 5,
      avgTaskCompletionTime: '3.0 days',
      recentDeliverables: 4,
      coverageRating: 'See coverage list',
    };
  }
  return null;
}

export function getCoveragePipeline(teamId) {
  return COVERAGE_PIPELINE[teamId] || [];
}

export function getAnalystCoverage(analystId) {
  return ANALYST_COVERAGE[analystId] || [];
}

export function getSkillDevelopment(analystId) {
  return ANALYST_SKILL_DEVELOPMENT[analystId] || null;
}
