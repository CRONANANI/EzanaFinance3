/**
 * Who receives help-centre feedback. One place for the page (labels) and the
 * API (team name in the confirmation, inbox env var). Each inbox falls back
 * to SUPPORT_INBOX when its own variable is unset.
 */
export const FEEDBACK_AREAS = {
  platform: {
    label: 'The platform',
    hint: 'Speed, bugs, design, navigation',
    team: 'platform team',
    inboxEnv: 'FEEDBACK_INBOX_PLATFORM',
  },
  product: {
    label: 'A product',
    hint: 'A specific tool or dataset',
    team: 'product team',
    inboxEnv: 'FEEDBACK_INBOX_PRODUCT',
  },
  support: {
    label: 'Support',
    hint: 'Help articles, answers, our replies',
    team: 'support team',
    inboxEnv: 'SUPPORT_INBOX',
  },
};

export const FEEDBACK_PRODUCTS = [
  { value: 'sonar', label: 'Ezana Sonar' },
  { value: 'echo', label: 'Ezana Echo' },
  { value: 'datasets', label: 'Datasets' },
  { value: 'politician-tracker', label: 'Politician tracker' },
  { value: 'research', label: 'Company research' },
  { value: 'trading', label: 'Portfolio and trading' },
  { value: 'community', label: 'Community' },
  { value: 'learning', label: 'Learning Center' },
  { value: 'team-hub', label: 'Team Hub (universities)' },
  { value: 'api', label: 'Ezana API' },
  { value: 'other', label: 'Something else' },
];
