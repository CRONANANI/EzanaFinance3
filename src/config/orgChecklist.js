// src/config/orgChecklist.js

export const ORG_CHECKLIST = {
  executive: {
    label: 'Executive Checklist',
    tasks: [
      { id: 'exec_1', title: 'Review team roster', description: 'Check that all teams have assigned PMs and analysts', page: '/org-team-hub' },
      { id: 'exec_2', title: 'Create your first event', description: 'Set up a stock pitch or portfolio review event', page: '/org-team-hub' },
      { id: 'exec_3', title: 'Review team portfolios', description: 'Check performance across all sector teams', page: '/home' },
      { id: 'exec_4', title: 'Post an announcement', description: 'Share a message with the entire council', page: '/community' },
      { id: 'exec_5', title: 'Configure permissions', description: 'Set up sub-roles for PMs and analysts', page: '/settings' },
      { id: 'exec_6', title: 'Explore the learning center', description: 'Assign learning content to your teams', page: '/learning-center' },
    ],
  },
  portfolio_manager: {
    label: 'Portfolio Manager Checklist',
    tasks: [
      { id: 'pm_1', title: 'Review your team roster', description: 'See who is on your team', page: '/org-team-hub' },
      { id: 'pm_2', title: 'Check upcoming events', description: 'Review deadlines and deliverables', page: '/home' },
      { id: 'pm_3', title: 'Assign a task to an analyst', description: 'Delegate research or model building', page: '/org-team-hub' },
      { id: 'pm_4', title: 'Upload a deliverable', description: 'Upload a deck, model, or primer to an event', page: '/org-team-hub' },
      { id: 'pm_5', title: 'Check your team portfolio', description: 'Review holdings and performance', page: '/watchlist' },
      { id: 'pm_6', title: 'Post a team update', description: 'Share progress with your team', page: '/community' },
    ],
  },
  analyst: {
    label: 'Analyst Checklist',
    tasks: [
      { id: 'an_1', title: 'View your team portfolio', description: 'See what your team is invested in', page: '/watchlist' },
      { id: 'an_2', title: 'Check your assigned tasks', description: 'See what your PM has assigned', page: '/home' },
      { id: 'an_3', title: 'View upcoming events', description: 'Know your deadlines', page: '/home' },
      { id: 'an_4', title: 'Start a learning module', description: 'Begin your first course', page: '/learning-center' },
      { id: 'an_5', title: 'Post in the community', description: 'Share an insight or ask a question', page: '/community' },
      { id: 'an_6', title: 'Research a company', description: 'Look up a stock in Company Research', page: '/company-research' },
    ],
  },
};

export function getOrgChecklistForRole(role) {
  return ORG_CHECKLIST[role] || ORG_CHECKLIST.analyst;
}
