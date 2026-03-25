'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { getAllCourseSummaries } from '@/lib/courses';
import { useChecklist } from '@/hooks/useChecklist';
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

const COURSE_SUMMARIES = getAllCourseSummaries();

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function LearningCenterPage() {
  const { user } = useAuth();
  const { completeTask } = useChecklist();
  const [activeTab, setActiveTab] = useState('dashboard');

  const userName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';
  const greeting = getGreeting();

  return (
    <div className="lc-page dashboard-page-inset">
      <div className="lc-greeting-row">
        <div className="lc-greeting">
          <h1>{greeting}, {userName} 👋</h1>
          <p>Boost your skills to shine in your investing journey.</p>
        </div>
        <button type="button" className="lc-search-btn">
          <i className="bi bi-search" /> Search Courses
        </button>
      </div>

      <div className="lc-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`lc-tab ${activeTab === tab.id ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`} /> {tab.label}
          </button>
        ))}
      </div>

      <div className={`tab-content ${activeTab === 'dashboard' ? 'active' : ''}`} data-content="dashboard">
        <div className="lc-tab-content">
        <div className="lc-dashboard-layout">
          <PinnableCard cardId="learning-course-table" title="My Courses" sourcePage="/learning-center" sourceLabel="Learning Center" defaultW={4} defaultH={2}>
          <div className="lc-table-wrap">
            <table className="lc-table">
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
                  <td><span className="lc-course-name">Portfolio Management Fundamentals</span></td>
                  <td><div className="lc-instructor"><span className="lc-instructor-avatar">WC</span> Warren Chen, CFA</div></td>
                  <td><div className="lc-progress-cell"><div className="lc-progress-bar"><div className="lc-progress-fill" style={{ width: '70%' }} /></div><span className="lc-progress-pct">70%</span></div></td>
                  <td><span className="lc-level-badge beginner">Beginner</span></td>
                  <td>Lesson 9 · Apr 27, 2026</td>
                  <td><button className="lc-action-btn" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                </tr>
                <tr>
                  <td><span className="lc-course-name">Risk Management Strategies</span></td>
                  <td><div className="lc-instructor"><span className="lc-instructor-avatar">SM</span> Sarah Miller, FRM</div></td>
                  <td><div className="lc-progress-cell"><div className="lc-progress-bar"><div className="lc-progress-fill" style={{ width: '40%' }} /></div><span className="lc-progress-pct">40%</span></div></td>
                  <td><span className="lc-level-badge intermediate">Intermediate</span></td>
                  <td>Lesson 8 · Apr 28, 2026</td>
                  <td><button className="lc-action-btn" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                </tr>
                <tr>
                  <td><span className="lc-course-name">Understanding Volatility</span></td>
                  <td><div className="lc-instructor"><span className="lc-instructor-avatar">JM</span> James Mitchell</div></td>
                  <td><div className="lc-progress-cell"><div className="lc-progress-bar"><div className="lc-progress-fill" style={{ width: '25%' }} /></div><span className="lc-progress-pct">25%</span></div></td>
                  <td><span className="lc-level-badge intermediate">Intermediate</span></td>
                  <td>Lesson 4 · May 1, 2026</td>
                  <td><button className="lc-action-btn" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          </PinnableCard>
          <PinnableCard cardId="learning-achievements" title="Achievements" sourcePage="/learning-center" sourceLabel="Learning Center" defaultW={2} defaultH={1}>
          <div className="lc-stats-card">
            <div className="lc-stat-item">
              <div className="lc-stat-icon courses"><i className="bi bi-journal-bookmark" /></div>
              <div><span className="lc-stat-value">15</span><span className="lc-stat-label">Courses Enrolled</span></div>
            </div>
            <div className="lc-stat-item">
              <div className="lc-stat-icon hours"><i className="bi bi-book" /></div>
              <div><span className="lc-stat-value">28</span><span className="lc-stat-label">Hours Learned</span></div>
            </div>
            <div className="lc-stat-item">
              <div className="lc-stat-icon reviews"><i className="bi bi-star-fill" /></div>
              <div><span className="lc-stat-value">12</span><span className="lc-stat-label">Reviews Earned</span></div>
            </div>
            <div className="lc-stat-item">
              <div className="lc-stat-icon streak"><i className="bi bi-fire" /></div>
              <div><span className="lc-stat-value">5</span><span className="lc-stat-label">Day Streak</span></div>
            </div>
          </div>
          </PinnableCard>
        </div>

        <section className="lc-section">
          <div className="lc-section-header">
            <div>
              <h2 className="lc-section-title">Recommended Courses</h2>
              <p className="lc-section-subtitle">Based on your learning activity, we&apos;ve curated a personalized course list for you.</p>
            </div>
            <a href="#" className="lc-section-link">View All</a>
          </div>
          <div className="lc-courses-grid">
            {COURSE_SUMMARIES.map((course, ci) => (
              <Link
                key={course.id}
                href={`/learning-center/${course.id}`}
                className="lc-course-card"
                data-task-target={ci === 0 ? 'learning-module-card' : undefined}
                onClick={() => completeTask('learning_1')}
              >
                <div className="lc-course-card-header">
                  <span className="lc-course-badge">Course</span>
                  <span className="lc-course-hours"><i className="bi bi-clock" /> {course.stats.duration}</span>
                </div>
                <h4 className="lc-course-card-title">{course.title}</h4>
                <p className="lc-course-card-desc">{course.subtitle}</p>
                <div className="lc-course-card-footer">
                  <div className="lc-course-card-tags">
                    <span className="lc-course-tag">{course.category}</span>
                    <span className="lc-course-tag">{course.stats.materials} lessons</span>
                  </div>
                  <span className="lc-course-card-link">View Course <i className="bi bi-arrow-right" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="lc-section">
          <div className="lc-section-header">
            <div>
              <h2 className="lc-section-title">Popular Course Topics</h2>
              <p className="lc-section-subtitle">Based on your learning activity, we&apos;ve curated popular topics for you.</p>
            </div>
            <a href="#" className="lc-section-link">View All</a>
          </div>
          <div className="lc-topic-pills">
            <a href="#" className="lc-topic-pill">Portfolio Management</a>
            <a href="#" className="lc-topic-pill">Risk Management</a>
            <a href="#" className="lc-topic-pill">Technical Analysis</a>
            <a href="#" className="lc-topic-pill">Quantitative Analysis</a>
            <a href="#" className="lc-topic-pill">Options Trading</a>
            <a href="#" className="lc-topic-pill">Market Psychology</a>
            <a href="#" className="lc-topic-pill">Financial Statements</a>
          </div>
        </section>
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'courses' ? 'active' : ''}`} data-content="courses">
        <div className="lc-tab-content">
        <h2 className="lc-section-title">Courses In Progress</h2>
        <div className="lc-progress-list">
          <div className="lc-progress-card">
            <div className="lc-progress-ring">
              <svg width="56" height="56"><circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" /><circle cx="28" cy="28" r="24" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="151" strokeDashoffset="45" transform="rotate(-90 28 28)" /></svg>
              <span className="lc-progress-ring-pct">70%</span>
            </div>
            <div className="lc-progress-card-info">
              <h3 className="lc-progress-card-title">Portfolio Management Fundamentals</h3>
              <p className="lc-progress-card-meta">Portfolio Management · 4 hours · 8 of 12 lessons completed</p>
            </div>
            <div className="lc-progress-card-actions">
              <button className="lc-continue-btn" type="button"><i className="bi bi-play-circle" /> Continue</button>
              <button className="lc-download-btn" type="button"><i className="bi bi-download" /> Materials</button>
            </div>
          </div>
          <div className="lc-progress-card">
            <div className="lc-progress-ring">
              <svg width="56" height="56"><circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" /><circle cx="28" cy="28" r="24" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="151" strokeDashoffset="91" transform="rotate(-90 28 28)" /></svg>
              <span className="lc-progress-ring-pct">40%</span>
            </div>
            <div className="lc-progress-card-info">
              <h3 className="lc-progress-card-title">Risk Management Strategies</h3>
              <p className="lc-progress-card-meta">Risk Management · 6 hours · 7 of 18 lessons completed</p>
            </div>
            <div className="lc-progress-card-actions">
              <button className="lc-continue-btn" type="button"><i className="bi bi-play-circle" /> Continue</button>
              <button className="lc-download-btn" type="button"><i className="bi bi-download" /> Materials</button>
            </div>
          </div>
        </div>
        <h2 className="lc-section-title">Completed Courses</h2>
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
      </div>

      <div className={`tab-content ${activeTab === 'skills' ? 'active' : ''}`} data-content="skills">
        <div className="lc-tab-content">
        <h2 className="lc-section-title">Your Skills</h2>
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
      </div>

      <div className={`tab-content ${activeTab === 'badges' ? 'active' : ''}`} data-content="badges">
        <div className="lc-tab-content">
        <h2 className="lc-section-title">Your Badges (12 Earned)</h2>
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
      </div>

      <div className={`tab-content ${activeTab === 'browse' ? 'active' : ''}`} data-content="browse">
        <div className="lc-tab-content">
        <h2 className="lc-section-title">Browse All Courses</h2>
        <p className="lc-muted-text">Explore our full catalog of courses. Use the Learning Opportunities sections on each research page to see topic-specific recommendations.</p>
        <div className="lc-courses-grid">
          {COURSE_SUMMARIES.map((course) => (
            <Link key={course.id} href={`/learning-center/${course.id}`} className="lc-course-card">
              <div className="lc-course-card-header">
                <span className="lc-course-badge">Course</span>
                <span className="lc-course-hours"><i className="bi bi-clock" /> {course.stats.duration}</span>
              </div>
              <h4 className="lc-course-card-title">{course.title}</h4>
              <p className="lc-course-card-desc">{course.subtitle}</p>
              <div className="lc-course-card-footer">
                <div className="lc-course-card-tags">
                  <span className="lc-course-tag">{course.category}</span>
                </div>
                <span className="lc-course-card-link">View Course <i className="bi bi-arrow-right" /></span>
              </div>
            </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
