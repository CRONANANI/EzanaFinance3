'use client';

import { useState } from 'react';
import { PinnableCard } from '@/components/ui/PinnableCard';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/learning-center.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid' },
  { id: 'courses', label: 'My Courses', icon: 'bi-book' },
  { id: 'skills', label: 'Skills', icon: 'bi-puzzle' },
  { id: 'badges', label: 'Badges', icon: 'bi-award' },
  { id: 'browse', label: 'Browse All', icon: 'bi-search' },
];

export default function LearningCenterPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="learning-center-container">
      <header className="learning-header-bar">
        <div className="learning-header-left">
          <h1 className="learning-welcome">Welcome back!</h1>
          <p className="learning-tagline">Boost your skills to shine in your investing journey.</p>
        </div>
        <div className="learning-search-wrap">
          <i className="bi bi-search" />
          <input type="text" className="learning-search-input" placeholder="Search Courses" id="learningSearchInput" />
        </div>
      </header>

      <div className="learning-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`learning-tab ${activeTab === tab.id ? 'active' : ''}`}
            data-tab={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`} /> {tab.label}
          </button>
        ))}
      </div>

      <div className={`tab-content ${activeTab === 'dashboard' ? 'active' : ''}`} data-content="dashboard">
        <section className="learning-upper-section">
          <PinnableCard cardId="learning-course-table" title="My Courses" sourcePage="/learning-center" sourceLabel="Learning Center" defaultW={4} defaultH={2}>
          <div className="learning-course-table-card">
            <div className="course-table-wrap">
              <table className="learning-course-table">
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Instructor</th>
                    <th>Progress</th>
                    <th>Level</th>
                    <th>Next Assignment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-label="Course"><strong>Portfolio Management Fundamentals</strong></td>
                    <td data-label="Instructor"><div className="instructor-cell"><span className="instructor-avatar">WC</span> Warren Chen, CFA</div></td>
                    <td data-label="Progress"><div className="progress-cell"><div className="progress-bar-inline"><div className="progress-fill" style={{ width: '70%' }} /></div><span>70%</span></div></td>
                    <td data-label="Level"><span className="level-badge beginner">Beginner</span></td>
                    <td data-label="Next">Lesson 9 · Apr 27, 2026</td>
                    <td data-label=""><button className="btn-icon" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                  </tr>
                  <tr>
                    <td data-label="Course"><strong>Risk Management Strategies</strong></td>
                    <td data-label="Instructor"><div className="instructor-cell"><span className="instructor-avatar">SM</span> Sarah Miller, FRM</div></td>
                    <td data-label="Progress"><div className="progress-cell"><div className="progress-bar-inline"><div className="progress-fill" style={{ width: '40%' }} /></div><span>40%</span></div></td>
                    <td data-label="Level"><span className="level-badge intermediate">Intermediate</span></td>
                    <td data-label="Next">Lesson 8 · Apr 28, 2026</td>
                    <td data-label=""><button className="btn-icon" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                  </tr>
                  <tr>
                    <td data-label="Course"><strong>Understanding Volatility</strong></td>
                    <td data-label="Instructor"><div className="instructor-cell"><span className="instructor-avatar">JM</span> James Mitchell</div></td>
                    <td data-label="Progress"><div className="progress-cell"><div className="progress-bar-inline"><div className="progress-fill" style={{ width: '25%' }} /></div><span>25%</span></div></td>
                    <td data-label="Level"><span className="level-badge intermediate">Intermediate</span></td>
                    <td data-label="Next">Lesson 4 · May 1, 2026</td>
                    <td data-label=""><button className="btn-icon" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </PinnableCard>
          <PinnableCard cardId="learning-achievements" title="Achievements" sourcePage="/learning-center" sourceLabel="Learning Center" defaultW={2} defaultH={1}>
          <div className="learning-achievements-card">
            <div className="achievement-row">
              <div className="achievement-icon blue"><i className="bi bi-journal-bookmark" /></div>
              <div className="achievement-content"><span className="achievement-value">15</span><span className="achievement-label">Courses Enrolled</span></div>
            </div>
            <div className="achievement-row">
              <div className="achievement-icon green"><i className="bi bi-book" /></div>
              <div className="achievement-content"><span className="achievement-value">28</span><span className="achievement-label">Hours Learned</span></div>
            </div>
            <div className="achievement-row">
              <div className="achievement-icon orange"><i className="bi bi-star-fill" /></div>
              <div className="achievement-content"><span className="achievement-value">12</span><span className="achievement-label">Reviews Earned</span></div>
            </div>
            <div className="achievement-row">
              <div className="achievement-icon red"><i className="bi bi-fire" /></div>
              <div className="achievement-content"><span className="achievement-value">5</span><span className="achievement-label">Day Streak</span></div>
            </div>
          </div>
          </PinnableCard>
        </section>

        <section className="learning-section recommended-courses">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Recommended Courses</h2>
              <p className="section-subtitle">Based on your learning activity, we&apos;ve curated a personalized course list for you.</p>
            </div>
            <button className="view-all-btn" type="button">View All</button>
          </div>
          <div className="courses-scroll-wrap">
            <div className="courses-scroll">
              <div className="course-card recommended-card">
                <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
                <h4 className="course-title">Portfolio Management Fundamentals</h4>
                <p className="course-description">Learn the core principles of portfolio construction and asset allocation.</p>
                <div className="course-tags"><span className="tag beginner">Beginner</span><span className="tag">12 lessons</span></div>
                <button className="enroll-btn full-width" type="button">Enroll Now</button>
              </div>
              <div className="course-card recommended-card">
                <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
                <h4 className="course-title">Risk Management Strategies</h4>
                <p className="course-description">Master advanced risk management techniques and hedging strategies.</p>
                <div className="course-tags"><span className="tag intermediate">Intermediate</span><span className="tag">18 lessons</span></div>
                <button className="enroll-btn full-width" type="button">Enroll Now</button>
              </div>
              <div className="course-card recommended-card">
                <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
                <h4 className="course-title">Technical Analysis Basics</h4>
                <p className="course-description">Learn to read charts and use technical indicators.</p>
                <div className="course-tags"><span className="tag beginner">Beginner</span><span className="tag">12 lessons</span></div>
                <button className="enroll-btn full-width" type="button">Enroll Now</button>
              </div>
              <div className="course-card recommended-card">
                <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 5 hours</span></div>
                <h4 className="course-title">Understanding Options</h4>
                <p className="course-description">Master options pricing and strategies.</p>
                <div className="course-tags"><span className="tag intermediate">Intermediate</span><span className="tag">16 lessons</span></div>
                <button className="enroll-btn full-width" type="button">Enroll Now</button>
              </div>
              <div className="course-card recommended-card">
                <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 3 hours</span></div>
                <h4 className="course-title">Market Psychology</h4>
                <p className="course-description">Understand behavioral finance and market sentiment.</p>
                <div className="course-tags"><span className="tag beginner">Beginner</span><span className="tag">10 lessons</span></div>
                <button className="enroll-btn full-width" type="button">Enroll Now</button>
              </div>
            </div>
          </div>
        </section>

        <section className="learning-section popular-topics">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Popular Course Topics</h2>
              <p className="section-subtitle">Based on your learning activity, we&apos;ve curated popular topics for you.</p>
            </div>
            <button className="view-all-btn" type="button">View All</button>
          </div>
          <div className="topics-scroll-wrap">
            <div className="topics-scroll">
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-pie-chart" /></div><span>Portfolio Management</span></div>
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-shield-check" /></div><span>Risk Management</span></div>
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-graph-up" /></div><span>Technical Analysis</span></div>
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-calculator" /></div><span>Quantitative Analysis</span></div>
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-arrow-left-right" /></div><span>Options Trading</span></div>
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-emoji-smile" /></div><span>Market Psychology</span></div>
              <div className="topic-card"><div className="topic-icon"><i className="bi bi-bar-chart" /></div><span>Financial Statements</span></div>
            </div>
          </div>
        </section>
      </div>

      <div className={`tab-content ${activeTab === 'courses' ? 'active' : ''}`} data-content="courses">
        <h2 className="section-title">Courses In Progress</h2>
        <div className="courses-list">
          <div className="course-item in-progress">
            <div className="course-thumbnail">
              <div className="thumbnail-placeholder"><i className="bi bi-journal-bookmark" /></div>
              <div className="progress-overlay">
                <div className="progress-circle">
                  <svg width="60" height="60"><circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" /><circle cx="30" cy="30" r="25" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="157" strokeDashoffset="47" transform="rotate(-90 30 30)" /></svg>
                  <span className="progress-percent">70%</span>
                </div>
              </div>
            </div>
            <div className="course-details">
              <div className="course-meta-top"><span className="course-category">Portfolio Management</span><span className="course-time">4 hours</span></div>
              <h3 className="course-name">Portfolio Management Fundamentals</h3>
              <p className="course-instructor"><i className="bi bi-person" /> Taught by Warren Chen, CFA</p>
              <div className="course-progress-bar">
                <div className="progress-bar-small"><div className="progress-fill" style={{ width: '70%' }} /></div>
                <span className="progress-text">8 of 12 lessons completed</span>
              </div>
              <div className="course-actions">
                <button className="btn-continue" type="button"><i className="bi bi-play-circle" /> Continue Learning</button>
                <button className="btn-secondary-small" type="button"><i className="bi bi-download" /> Download Materials</button>
              </div>
            </div>
          </div>
          <div className="course-item in-progress">
            <div className="course-thumbnail">
              <div className="thumbnail-placeholder"><i className="bi bi-shield-check" /></div>
              <div className="progress-overlay">
                <div className="progress-circle">
                  <svg width="60" height="60"><circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" /><circle cx="30" cy="30" r="25" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="157" strokeDashoffset="94" transform="rotate(-90 30 30)" /></svg>
                  <span className="progress-percent">40%</span>
                </div>
              </div>
            </div>
            <div className="course-details">
              <div className="course-meta-top"><span className="course-category">Risk Management</span><span className="course-time">6 hours</span></div>
              <h3 className="course-name">Risk Management Strategies</h3>
              <p className="course-instructor"><i className="bi bi-person" /> Taught by Sarah Miller, FRM</p>
              <div className="course-progress-bar">
                <div className="progress-bar-small"><div className="progress-fill" style={{ width: '40%' }} /></div>
                <span className="progress-text">7 of 18 lessons completed</span>
              </div>
              <div className="course-actions">
                <button className="btn-continue" type="button"><i className="bi bi-play-circle" /> Continue Learning</button>
                <button className="btn-secondary-small" type="button"><i className="bi bi-download" /> Download Materials</button>
              </div>
            </div>
          </div>
        </div>
        <h2 className="section-title">Completed Courses</h2>
        <div className="courses-grid-small">
          <div className="course-card-small completed">
            <div className="completion-badge"><i className="bi bi-check-circle-fill" /></div>
            <h4>Technical Analysis Basics</h4>
            <p className="course-meta">12 lessons · 4 hours</p>
            <div className="course-rating"><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /></div>
            <button className="btn-review" type="button">Review Course</button>
          </div>
          <div className="course-card-small completed">
            <div className="completion-badge"><i className="bi bi-check-circle-fill" /></div>
            <h4>Understanding Options</h4>
            <p className="course-meta">16 lessons · 5 hours</p>
            <div className="course-rating"><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star" /></div>
            <button className="btn-review" type="button">Review Course</button>
          </div>
          <div className="course-card-small completed">
            <div className="completion-badge"><i className="bi bi-check-circle-fill" /></div>
            <h4>Market Psychology</h4>
            <p className="course-meta">10 lessons · 3 hours</p>
            <div className="course-rating"><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /><i className="bi bi-star-fill" /></div>
            <button className="btn-review" type="button">Review Course</button>
          </div>
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'skills' ? 'active' : ''}`} data-content="skills">
        <h2 className="section-title">Your Skills</h2>
        <div className="skills-grid">
          <div className="skill-card mastered">
            <div className="skill-header"><div className="skill-icon"><i className="bi bi-graph-up" /></div><span className="skill-level">Mastered</span></div>
            <h3 className="skill-name">Technical Analysis</h3>
            <div className="skill-progress"><div className="progress-bar-skill"><div className="progress-fill" style={{ width: '100%' }} /></div><span className="skill-percentage">100%</span></div>
            <div className="skill-stats"><div className="stat-small"><i className="bi bi-book" /><span>5 courses</span></div><div className="stat-small"><i className="bi bi-award" /><span>3 badges</span></div></div>
          </div>
          <div className="skill-card proficient">
            <div className="skill-header"><div className="skill-icon"><i className="bi bi-pie-chart" /></div><span className="skill-level">Proficient</span></div>
            <h3 className="skill-name">Portfolio Management</h3>
            <div className="skill-progress"><div className="progress-bar-skill"><div className="progress-fill" style={{ width: '75%' }} /></div><span className="skill-percentage">75%</span></div>
            <div className="skill-stats"><div className="stat-small"><i className="bi bi-book" /><span>3 courses</span></div><div className="stat-small"><i className="bi bi-award" /><span>2 badges</span></div></div>
          </div>
          <div className="skill-card learning">
            <div className="skill-header"><div className="skill-icon"><i className="bi bi-shield" /></div><span className="skill-level">Learning</span></div>
            <h3 className="skill-name">Risk Management</h3>
            <div className="skill-progress"><div className="progress-bar-skill"><div className="progress-fill" style={{ width: '40%' }} /></div><span className="skill-percentage">40%</span></div>
            <div className="skill-stats"><div className="stat-small"><i className="bi bi-book" /><span>2 courses</span></div><div className="stat-small"><i className="bi bi-award" /><span>1 badge</span></div></div>
          </div>
          <div className="skill-card learning">
            <div className="skill-header"><div className="skill-icon"><i className="bi bi-calculator" /></div><span className="skill-level">Learning</span></div>
            <h3 className="skill-name">Quantitative Analysis</h3>
            <div className="skill-progress"><div className="progress-bar-skill"><div className="progress-fill" style={{ width: '25%' }} /></div><span className="skill-percentage">25%</span></div>
            <div className="skill-stats"><div className="stat-small"><i className="bi bi-book" /><span>1 course</span></div><div className="stat-small"><i className="bi bi-award" /><span>0 badges</span></div></div>
          </div>
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'badges' ? 'active' : ''}`} data-content="badges">
        <h2 className="section-title">Your Badges (12 Earned)</h2>
        <div className="badges-grid">
          <div className="badge-card earned">
            <div className="badge-icon gold"><i className="bi bi-trophy-fill" /></div>
            <h3 className="badge-name">Portfolio Master</h3>
            <p className="badge-description">Completed 5 portfolio management courses</p>
            <div className="badge-date">Earned on Jan 15, 2026</div>
            <div className="badge-rarity rare">Rare</div>
          </div>
          <div className="badge-card earned">
            <div className="badge-icon silver"><i className="bi bi-graph-up-arrow" /></div>
            <h3 className="badge-name">Technical Analyst</h3>
            <p className="badge-description">Mastered technical analysis fundamentals</p>
            <div className="badge-date">Earned on Dec 28, 2025</div>
            <div className="badge-rarity common">Common</div>
          </div>
          <div className="badge-card earned">
            <div className="badge-icon bronze"><i className="bi bi-fire" /></div>
            <h3 className="badge-name">5-Day Streak</h3>
            <p className="badge-description">Learned for 5 consecutive days</p>
            <div className="badge-date">Earned on Feb 10, 2026</div>
            <div className="badge-rarity common">Common</div>
          </div>
          <div className="badge-card locked">
            <div className="badge-icon locked-icon"><i className="bi bi-lock-fill" /></div>
            <h3 className="badge-name">Options Expert</h3>
            <p className="badge-description">Complete 3 options trading courses</p>
            <div className="badge-progress">Progress: 1/3 courses</div>
          </div>
          <div className="badge-card locked">
            <div className="badge-icon locked-icon"><i className="bi bi-lock-fill" /></div>
            <h3 className="badge-name">Macro Guru</h3>
            <p className="badge-description">Master economic indicators analysis</p>
            <div className="badge-progress">Progress: 0/4 courses</div>
          </div>
          <div className="badge-card locked">
            <div className="badge-icon locked-icon"><i className="bi bi-lock-fill" /></div>
            <h3 className="badge-name">Quant Master</h3>
            <p className="badge-description">Complete all quantitative courses</p>
            <div className="badge-progress">Progress: 1/8 courses</div>
          </div>
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'browse' ? 'active' : ''}`} data-content="browse">
        <h2 className="section-title">Browse All Courses</h2>
        <p className="muted-text">Explore our full catalog of courses. Use the Learning Opportunities sections on each research page to see topic-specific recommendations.</p>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
            <h4 className="course-title">Portfolio Management Fundamentals</h4>
            <p className="course-description">Learn the core principles of portfolio construction and asset allocation.</p>
            <div className="course-footer"><span className="course-level beginner">Beginner</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Risk Management Strategies</h4>
            <p className="course-description">Master advanced risk management techniques.</p>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
