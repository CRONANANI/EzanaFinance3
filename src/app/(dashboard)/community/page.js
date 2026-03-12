'use client';

import { useState, useRef, useEffect } from 'react';
import { PinnableCard } from '@/components/ui/PinnableCard';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/components/community/trophy-cabinet/trophy-cabinet.css';
import '../../../../app-legacy/assets/css/cards-common.css';
import '../../../../app-legacy/assets/css/metrics-common.css';
import '../../../../app-legacy/assets/css/research-pages-cards.css';
import '../../../../app-legacy/pages/community.css';

const TRENDING_DISCUSSIONS = [
  { id: 1, author: 'AS', name: 'Aakash Sharma', tag: 'Portfolio Tips', title: 'What are some effective strategies to stay productive with market research?', preview: "I've been struggling to keep up with sector rotations...", time: '2 Hrs Ago', likes: 20, comments: 8 },
  { id: 2, author: 'NR', name: 'Nidhi Rao', tag: 'Congressional Trading', title: 'Best practices for interpreting 13F filings and congressional disclosure data', preview: 'New to following institutional moves...', time: '3 Hrs Ago', likes: 35, comments: 9 },
  { id: 3, author: 'SP', name: 'Sunita Patil', tag: 'Time Management', title: 'How do you balance fundamental analysis with keeping up to date on market news?', preview: "Finding it hard to allocate time...", time: '5 Hrs Ago', likes: 17, comments: 6 },
  { id: 4, author: 'AJ', name: 'Alex Johnson', tag: 'Technology', title: 'Q1 2024 Tech Stock Predictions', preview: "What are everyone's thoughts on the tech sector...", time: '6 Hrs Ago', likes: 45, comments: 23 },
  { id: 5, author: 'SC', name: 'Sarah Chen', tag: 'Dividends', title: 'Best Dividend Stocks for 2024', preview: "Looking for stable dividend-paying stocks...", time: '8 Hrs Ago', likes: 32, comments: 18 },
];
const FOLLOWING_DISCUSSIONS = TRENDING_DISCUSSIONS.slice(0, 2);
const SUGGESTED_DISCUSSIONS = [
  { id: 6, author: 'MB', name: 'Mike Brown', tag: 'Congress', title: 'Congressional Trading Alert System', preview: "Has anyone set up automated alerts...", time: '1 day ago', likes: 89, comments: 56 },
  { id: 7, author: 'EW', name: 'Emma Wilson', tag: 'AI Stocks', title: 'AI sector momentum discussion', preview: "The AI rally continues...", time: '2 days ago', likes: 67, comments: 34 },
];
const FRIENDS_LIST = [
  { id: 1, initials: 'EM', name: 'Eric Morrison', streak: 410 },
  { id: 2, initials: 'JM', name: 'Joseph Morrison', streak: 328 },
  { id: 3, initials: 'JM', name: 'John Morrison', streak: 256 },
  { id: 4, initials: 'EM', name: 'Emily Morrison', streak: 142 },
  { id: 5, initials: 'DL', name: 'Diana Larussa', streak: 354, isYou: true },
  { id: 6, initials: 'CL', name: 'Cathy Morrison', streak: 89 },
];

export default function CommunityPage() {
  const [activeFeed, setActiveFeed] = useState('trending');
  const [friendsView, setFriendsView] = useState('list');
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const addFriendRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addFriendRef.current && !addFriendRef.current.contains(e.target)) setAddFriendOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFeedDiscussions = () => {
    if (activeFeed === 'trending') return TRENDING_DISCUSSIONS;
    if (activeFeed === 'following' || activeFeed === 'followed') return FOLLOWING_DISCUSSIONS;
    if (activeFeed === 'start') return [];
    return TRENDING_DISCUSSIONS;
  };

  const discussions = getFeedDiscussions();
  const needsSuggested = discussions.length < 4 && activeFeed !== 'start';
  const displayDiscussions = needsSuggested ? [...discussions, ...SUGGESTED_DISCUSSIONS.slice(0, 4 - discussions.length)] : discussions;

  return (
    <>
      <div className="stats-grid condensed">
        <div className="stat-card stat-card-with-buttons">
          <div className="stat-icon members"><i className="bi bi-people" /></div>
          <div className="stat-content">
            <div className="stat-value">12,456</div>
            <div className="stat-label">Total Members</div>
            <div className="stat-card-buttons">
              <button type="button" className="stat-card-btn">Browse</button>
              <button type="button" className="stat-card-btn">Top</button>
              <button type="button" className="stat-card-btn">New</button>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-with-buttons">
          <div className="stat-icon posts"><i className="bi bi-chat-dots" /></div>
          <div className="stat-content">
            <div className="stat-value">89</div>
            <div className="stat-label">Active Discussions</div>
            <div className="stat-card-buttons">
              <button type="button" className={`stat-card-btn ${activeFeed === 'start' ? 'active' : ''}`} onClick={() => setActiveFeed('start')}>Start</button>
              <button type="button" className={`stat-card-btn ${activeFeed === 'following' ? 'active' : ''}`} onClick={() => setActiveFeed('following')}>Following</button>
              <button type="button" className={`stat-card-btn ${activeFeed === 'trending' ? 'active' : ''}`} onClick={() => setActiveFeed('trending')}>Trending</button>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-with-buttons">
          <div className="stat-icon engagement"><i className="bi bi-person-hearts" /></div>
          <div className="stat-content">
            <div className="stat-value">47</div>
            <div className="stat-label">Your Friends</div>
            <div className="stat-card-buttons">
              <button type="button" className={`stat-card-btn ${friendsView === 'all' ? 'active' : ''}`} onClick={() => setFriendsView('all')}>View All</button>
              <button type="button" className={`stat-card-btn ${addFriendOpen ? 'active' : ''}`} onClick={() => setAddFriendOpen(!addFriendOpen)}>Add</button>
              <button type="button" className={`stat-card-btn ${friendsView === 'activity' ? 'active' : ''}`} onClick={() => setFriendsView('activity')}>Activity</button>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-with-buttons">
          <div className="stat-icon experts"><i className="bi bi-trophy" /></div>
          <div className="stat-content">
            <div className="stat-value">#127</div>
            <div className="stat-label">Your Rank</div>
            <div className="stat-card-buttons">
              <button type="button" className="stat-card-btn">Leaderboard</button>
              <button type="button" className="stat-card-btn">Awards</button>
              <button type="button" className="stat-card-btn">My Stats</button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid community-features-grid">
        <PinnableCard cardId="community-feed" title="Community Feed" sourcePage="/community" sourceLabel="Community" defaultW={4} defaultH={3}>
        <div className="component-card community-feed-card">
          <div className="card-header"><h3><i className="bi bi-chat-square-text" /> Community Feed</h3></div>
          <div className="card-body">
            <div className="community-feed-filters">
              <button type="button" className={`feed-filter-btn ${activeFeed === 'followed' ? 'active' : ''}`} onClick={() => setActiveFeed('following')}>Followed Discussions</button>
              <button type="button" className={`feed-filter-btn ${activeFeed === 'topics' ? 'active' : ''}`} onClick={() => setActiveFeed('topics')}>Topics</button>
              <button type="button" className={`feed-filter-btn ${activeFeed === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveFeed('suggestions')}>Platform Feature Suggestions</button>
              <button type="button" className={`feed-filter-btn ${activeFeed === 'trending' ? 'active' : ''}`} onClick={() => setActiveFeed('trending')}>Trending</button>
              <button type="button" className={`feed-filter-btn ${activeFeed === 'explore' ? 'active' : ''}`} onClick={() => setActiveFeed('explore')}>Explore</button>
            </div>
            <div className="community-feed-threads" id="community-feed-threads">
              {activeFeed === 'start' ? (
                <div className="p-8 text-center text-muted-foreground">
                  <i className="bi bi-plus-circle text-4xl mb-4 block" />
                  <p>Start a new discussion to share your insights with the community.</p>
                </div>
              ) : (
                displayDiscussions.map((d) => (
                  <article key={d.id} className="feed-thread-card">
                    <div className="thread-meta-top">
                      <div className="thread-author"><div className="thread-avatar">{d.author}</div><span className="thread-author-name">{d.name}</span></div>
                      <span className="thread-topic-tag">{d.tag}</span>
                    </div>
                    <h4 className="thread-title">{d.title}</h4>
                    <p className="thread-preview">{d.preview}</p>
                    <div className="thread-engagement">
                      <div className="thread-avatar-sm">{d.author}</div>
                      <span className="thread-time">{d.time}</span>
                      <span className="thread-stat"><i className="bi bi-heart-fill" /> {d.likes}</span>
                      <span className="thread-stat"><i className="bi bi-chat" /> {d.comments}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
        </PinnableCard>

        <PinnableCard cardId="my-friends" title="My Friends" sourcePage="/community" sourceLabel="Community" defaultW={2} defaultH={3}>
        <div className="component-card my-friends-card" ref={addFriendRef}>
          <div className="card-header">
            <h3><i className="bi bi-people-fill" /> My Friends</h3>
            {addFriendOpen ? (
              <div className="add-friend-search-wrapper">
                <input
                  type="text"
                  placeholder="Search for friends..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  className="add-friend-search-input"
                  autoFocus
                />
              </div>
            ) : (
              <button type="button" className="add-friend-btn" onClick={() => setAddFriendOpen(true)}><i className="bi bi-person-plus" /> Add a new friend</button>
            )}
          </div>
          <div className="card-body">
            <div className="league-tiers">
              <div className="league-hexagon league-unlocked" title="Ruby League"><i className="bi bi-gem" /></div>
              <div className="league-hexagon league-current" title="Emerald League"><i className="bi bi-gem" /></div>
              <div className="league-hexagon league-locked" title="Locked"><i className="bi bi-lock" /></div>
              <div className="league-hexagon league-locked" title="Locked"><i className="bi bi-lock" /></div>
              <div className="league-hexagon league-locked" title="Locked"><i className="bi bi-lock" /></div>
            </div>
            <div className="league-title">Emerald League</div>
            <div className="rank-toggle">
              <button type="button" className="rank-tab active" data-rank="local">Local Rank</button>
              <button type="button" className="rank-tab" data-rank="friend">Friend Rank</button>
            </div>
            <div className="user-stats-row">
              <div className="user-stat-card"><i className="bi bi-fire text-primary" /><span className="user-stat-value">354</span><span className="user-stat-label">days</span></div>
              <div className="user-stat-card"><i className="bi bi-gem" /><span className="user-stat-value">Emerald</span><span className="user-stat-label">League</span></div>
            </div>
            <div className="friends-ranked-list" id="friends-ranked-list">
              {(friendsView === 'all' || friendsView === 'list') && FRIENDS_LIST.map((f, i) => (
                <div key={f.id} className={`friend-rank-item ${f.isYou ? 'friend-rank-you' : ''}`}>
                  <div className={`friend-rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>{i < 3 ? <i className="bi bi-trophy-fill" /> : i + 1}</div>
                  <div className="friend-avatar">{f.initials}</div>
                  <div className="friend-info"><span className="friend-name">{f.name}</span><span className="friend-streak"><i className="bi bi-fire" /> {f.streak} days</span></div>
                </div>
              ))}
              {friendsView === 'activity' && (
                <div className="space-y-3 p-4">
                  <p className="text-sm text-muted-foreground">Recent friend activity</p>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-bold">EM</div>
                    <div><p className="text-sm text-foreground"><span className="font-medium">Eric Morrison</span> made a new investment in <span className="text-primary font-medium">NVDA</span></p><p className="text-xs text-muted-foreground">2 hours ago</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-xs font-bold">JM</div>
                    <div><p className="text-sm text-foreground"><span className="font-medium">Joseph Morrison</span> liked your post</p><p className="text-xs text-muted-foreground">4 hours ago</p></div>
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="view-all-friends-btn" onClick={() => setFriendsView('all')}>View All Friends</button>
          </div>
        </div>
        </PinnableCard>

        <PinnableCard cardId="friends-activity" title="Friends Activity" sourcePage="/community" sourceLabel="Community" defaultW={2} defaultH={1}>
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-activity" /> Friends Activity</h3></div>
          <div className="card-body">
            <p className="text-muted-foreground mb-6">Track your friends&apos; investment activities and engagement</p>
            <div id="activity-feed" className="space-y-4 max-h-48 overflow-y-auto">
              <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center flex-shrink-0"><i className="bi bi-graph-up text-primary-foreground text-sm" /></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground"><span className="font-medium">Alex Johnson</span> made a new investment in <span className="text-primary font-medium">TSLA</span></p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center flex-shrink-0"><i className="bi bi-heart text-accent-foreground text-sm" /></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground"><span className="font-medium">Sarah Chen</span> liked your post about <span className="text-accent font-medium">market analysis</span></p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-chart-3 rounded-xl flex items-center justify-center flex-shrink-0"><i className="bi bi-chat text-chart-2 text-sm" /></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground"><span className="font-medium">Mike Brown</span> commented on <span className="text-chart-3 font-medium">tech sector trends</span></p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
            <button type="button" className="w-full bg-chart-5 text-chart-2 py-3 rounded-xl hover:bg-opacity-90 transition-colors text-sm font-medium mt-4">View Full Activity</button>
          </div>
        </div>
        </PinnableCard>
      </div>

      <div className="dashboard-grid community-discussions-grid">
        <PinnableCard cardId="active-discussions" title="Active Discussions" sourcePage="/community" sourceLabel="Community" defaultW={4} defaultH={2}>
        <div className="component-card">
          <div className="card-header">
            <h3><i className="bi bi-chat-dots" /> Active Discussions</h3>
            <div className="discussion-filter-buttons">
              <button type="button" className={`discussion-filter-btn ${activeFeed === 'start' ? 'active' : ''}`} onClick={() => setActiveFeed('start')}><i className="bi bi-plus-circle" /> Start Discussion</button>
              <button type="button" className={`discussion-filter-btn ${activeFeed === 'following' ? 'active' : ''}`} onClick={() => setActiveFeed('following')}><i className="bi bi-bookmark" /> Following</button>
              <button type="button" className={`discussion-filter-btn ${activeFeed === 'trending' ? 'active' : ''}`} onClick={() => setActiveFeed('trending')}><i className="bi bi-fire" /> Trending</button>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"><span className="text-primary-foreground text-xs font-bold">AJ</span></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Q1 2024 Tech Stock Predictions</h4>
                      <p className="text-sm text-muted-foreground">by Alex Johnson · 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground"><i className="bi bi-chat" /><span>23</span><i className="bi bi-heart" /><span>45</span></div>
                </div>
                <p className="text-muted-foreground text-sm mb-3">What are everyone&apos;s thoughts on the tech sector for Q1? I&apos;m seeing some interesting patterns in congressional trading...</p>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">Technology</span>
                  <span className="px-2 py-1 bg-accent text-primary text-xs rounded">Predictions</span>
                  <span className="px-2 py-1 bg-accent text-primary text-xs rounded">Hot</span>
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"><span className="text-primary-foreground text-xs font-bold">SC</span></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Best Dividend Stocks for 2024</h4>
                      <p className="text-sm text-muted-foreground">by Sarah Chen · 5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground"><i className="bi bi-chat" /><span>18</span><i className="bi bi-heart" /><span>32</span></div>
                </div>
                <p className="text-muted-foreground text-sm mb-3">Looking for stable dividend-paying stocks. What&apos;s everyone&apos;s favorite picks for consistent income?</p>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">Dividends</span>
                  <span className="px-2 py-1 bg-accent text-primary text-xs rounded">Income</span>
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center"><span className="text-primary text-xs font-bold">MB</span></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Congressional Trading Alert System</h4>
                      <p className="text-sm text-muted-foreground">by Mike Brown · 1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground"><i className="bi bi-chat" /><span>56</span><i className="bi bi-heart" /><span>89</span></div>
                </div>
                <p className="text-muted-foreground text-sm mb-3">Has anyone set up automated alerts for congressional trading? I&apos;d love to get notified when certain members make trades...</p>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">Congress</span>
                  <span className="px-2 py-1 bg-accent text-primary text-xs rounded">Alerts</span>
                  <span className="px-2 py-1 bg-accent text-primary text-xs rounded">Trending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </PinnableCard>

        <PinnableCard cardId="leaderboard" title="Leaderboard" sourcePage="/community" sourceLabel="Community" defaultW={2} defaultH={2}>
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-trophy" /> Leaderboard</h3></div>
          <div className="card-body">
            <p className="text-muted-foreground mb-4 text-sm">Top performers this month</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"><i className="bi bi-trophy-fill text-white" /></div>
                <div className="flex-1"><div className="text-sm font-bold text-gray-900 dark:text-white">Emma Wilson</div><div className="text-xs text-gray-600 dark:text-gray-400">+34.5% return</div></div>
                <div className="text-right"><div className="text-xs font-bold text-yellow-600 dark:text-yellow-400">#1</div></div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"><span className="text-foreground text-xs font-bold">2</span></div>
                <div className="flex-1"><div className="text-sm font-medium text-foreground">David Kim</div><div className="text-xs text-muted-foreground">+28.2% return</div></div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center"><span className="text-foreground text-xs font-bold">3</span></div>
                <div className="flex-1"><div className="text-sm font-medium text-foreground">Lisa Park</div><div className="text-xs text-muted-foreground">+25.7% return</div></div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-accent/30 rounded-lg border border-primary/30">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"><span className="text-primary-foreground text-xs font-bold">127</span></div>
                <div className="flex-1"><div className="text-sm font-medium text-foreground">You</div><div className="text-xs text-muted-foreground">+12.4% return</div></div>
              </div>
            </div>
          </div>
        </div>
        </PinnableCard>
      </div>

      <PinnableCard cardId="community-insights" title="Community Insights" sourcePage="/community" sourceLabel="Community" defaultW={4} defaultH={1}>
      <div className="component-card">
        <div className="card-header"><h3><i className="bi bi-bar-chart" /> Community Insights</h3></div>
        <div className="card-body">
          <div className="community-insights-grid">
            <div className="text-center insight-item">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3"><i className="bi bi-graph-up text-primary text-2xl" /></div>
              <h4 className="font-semibold text-foreground mb-2">Most Discussed Stock</h4>
              <div className="text-2xl font-bold text-primary">NVDA</div>
              <div className="text-sm text-muted-foreground">89 mentions this week</div>
            </div>
            <div className="text-center insight-item">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3"><i className="bi bi-trending-up text-primary text-2xl" /></div>
              <h4 className="font-semibold text-foreground mb-2">Trending Topic</h4>
              <div className="text-lg font-bold text-primary">AI Stocks</div>
              <div className="text-sm text-muted-foreground">156 discussions</div>
            </div>
            <div className="text-center insight-item">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-3"><i className="bi bi-people text-primary text-2xl" /></div>
              <h4 className="font-semibold text-foreground mb-2">Most Active User</h4>
              <div className="text-lg font-bold text-primary">InvestorPro</div>
              <div className="text-sm text-muted-foreground">45 posts this week</div>
            </div>
          </div>
        </div>
      </div>
      </PinnableCard>
    </>
  );
}
