'use client';

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

export default function CommunityPage() {
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
              <button type="button" className="stat-card-btn">Start</button>
              <button type="button" className="stat-card-btn">Following</button>
              <button type="button" className="stat-card-btn">Trending</button>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-with-buttons">
          <div className="stat-icon engagement"><i className="bi bi-person-hearts" /></div>
          <div className="stat-content">
            <div className="stat-value">47</div>
            <div className="stat-label">Your Friends</div>
            <div className="stat-card-buttons">
              <button type="button" className="stat-card-btn">View All</button>
              <button type="button" className="stat-card-btn">Add</button>
              <button type="button" className="stat-card-btn">Activity</button>
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
        <div className="component-card community-feed-card">
          <div className="card-header"><h3><i className="bi bi-chat-square-text" /> Community Feed</h3></div>
          <div className="card-body">
            <div className="community-feed-filters">
              <button type="button" className="feed-filter-btn active" data-filter="followed">Followed Discussions</button>
              <button type="button" className="feed-filter-btn" data-filter="topics">Topics</button>
              <button type="button" className="feed-filter-btn" data-filter="suggestions">Platform Feature Suggestions</button>
              <button type="button" className="feed-filter-btn" data-filter="trending">Trending</button>
              <button type="button" className="feed-filter-btn" data-filter="explore">Explore</button>
            </div>
            <div className="community-feed-threads" id="community-feed-threads">
              <article className="feed-thread-card">
                <div className="thread-meta-top">
                  <div className="thread-author"><div className="thread-avatar">AS</div><span className="thread-author-name">Aakash Sharma</span></div>
                  <span className="thread-topic-tag">Portfolio Tips</span>
                </div>
                <h4 className="thread-title">What are some effective strategies to stay productive with market research, especially when tracking multiple sectors?</h4>
                <p className="thread-preview">I&apos;ve been struggling to keep up with sector rotations and earnings cycles. Would love to hear how others structure their research workflow...</p>
                <div className="thread-engagement">
                  <div className="thread-avatar-sm">AS</div>
                  <span className="thread-time">2 Hrs Ago</span>
                  <span className="thread-stat"><i className="bi bi-heart-fill" /> 20</span>
                  <span className="thread-stat"><i className="bi bi-chat" /> 8</span>
                </div>
              </article>
              <article className="feed-thread-card">
                <div className="thread-meta-top">
                  <div className="thread-author"><div className="thread-avatar">NR</div><span className="thread-author-name">Nidhi Rao</span></div>
                  <span className="thread-topic-tag">Congressional Trading</span>
                </div>
                <h4 className="thread-title">Best practices for interpreting 13F filings and congressional disclosure data</h4>
                <p className="thread-preview">New to following institutional moves. What metrics do you focus on when analyzing 13F changes? Any tools you recommend?</p>
                <div className="thread-engagement">
                  <div className="thread-avatar-sm">NR</div>
                  <span className="thread-time">3 Hrs Ago</span>
                  <span className="thread-stat"><i className="bi bi-heart-fill" /> 35</span>
                  <span className="thread-stat"><i className="bi bi-chat" /> 9</span>
                </div>
              </article>
              <article className="feed-thread-card">
                <div className="thread-meta-top">
                  <div className="thread-author"><div className="thread-avatar">SP</div><span className="thread-author-name">Sunita Patil</span></div>
                  <span className="thread-topic-tag">Time Management</span>
                </div>
                <h4 className="thread-title">How do you balance fundamental analysis with keeping up to date on market news?</h4>
                <p className="thread-preview">Finding it hard to allocate time between deep dives and staying current. What&apos;s your daily routine look like?</p>
                <div className="thread-engagement">
                  <div className="thread-avatar-sm">SP</div>
                  <span className="thread-time">5 Hrs Ago</span>
                  <span className="thread-stat"><i className="bi bi-heart-fill" /> 17</span>
                  <span className="thread-stat"><i className="bi bi-chat" /> 6</span>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="component-card my-friends-card">
          <div className="card-header">
            <h3><i className="bi bi-people-fill" /> My Friends</h3>
            <button type="button" className="add-friend-btn"><i className="bi bi-person-plus" /> Add a new friend</button>
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
              <div className="friend-rank-item">
                <div className="friend-rank-badge rank-1"><i className="bi bi-trophy-fill" /></div>
                <div className="friend-avatar">EM</div>
                <div className="friend-info"><span className="friend-name">Eric Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 410 days</span></div>
              </div>
              <div className="friend-rank-item">
                <div className="friend-rank-badge rank-2"><i className="bi bi-trophy-fill" /></div>
                <div className="friend-avatar">JM</div>
                <div className="friend-info"><span className="friend-name">Joseph Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 328 days</span></div>
              </div>
              <div className="friend-rank-item">
                <div className="friend-rank-badge rank-3"><i className="bi bi-trophy-fill" /></div>
                <div className="friend-avatar">JM</div>
                <div className="friend-info"><span className="friend-name">John Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 256 days</span></div>
              </div>
              <div className="friend-rank-item">
                <div className="friend-rank-badge">4</div>
                <div className="friend-avatar">EM</div>
                <div className="friend-info"><span className="friend-name">Emily Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 142 days</span></div>
              </div>
              <div className="friend-rank-item friend-rank-you">
                <div className="friend-rank-badge">5</div>
                <div className="friend-avatar">DL</div>
                <div className="friend-info"><span className="friend-name">Diana Larussa</span><span className="friend-streak"><i className="bi bi-fire" /> 354 days</span></div>
              </div>
              <div className="friend-rank-item">
                <div className="friend-rank-badge">6</div>
                <div className="friend-avatar">CL</div>
                <div className="friend-info"><span className="friend-name">Cathy Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 89 days</span></div>
              </div>
            </div>
            <button type="button" className="view-all-friends-btn">View All Friends</button>
          </div>
        </div>

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
      </div>

      <div className="dashboard-grid community-discussions-grid">
        <div className="component-card">
          <div className="card-header">
            <h3><i className="bi bi-chat-dots" /> Active Discussions</h3>
            <div className="discussion-filter-buttons">
              <button type="button" className="discussion-filter-btn"><i className="bi bi-plus-circle" /> Start Discussion</button>
              <button type="button" className="discussion-filter-btn active" data-filter="following"><i className="bi bi-bookmark" /> Following</button>
              <button type="button" className="discussion-filter-btn" data-filter="trending"><i className="bi bi-fire" /> Trending</button>
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
      </div>

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
    </>
  );
}
