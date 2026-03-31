/**
 * Default user_settings keys merged with profiles.user_settings (JSONB).
 * Add new keys here so existing users get defaults without migrations.
 */
export function getDefaultUserSettings() {
  return {
    theme: 'dark',
    language: 'en',
    currency: 'USD',
    timezone:
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
        : 'America/New_York',

    notifications_email_trades: true,
    notifications_email_alerts: true,
    notifications_email_community: false,
    notifications_email_newsletter: true,
    notifications_desktop_enabled: false,

    display_name: '',
    bio: '',
    avatar_url: '',

    default_watchlist: 'main',
    chart_style: 'candlestick',
    chart_timeframe: '1D',

    privacy_show_profile: true,
    privacy_show_portfolio: false,
    privacy_show_trades: false,
    privacy_show_holdings: false,
    privacy_show_activity: true,
    privacy_show_watchlist: false,
    privacy_show_on_leaderboard: true,

    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    country: 'United States',
    city: '',
    state: '',

    investor_type: 'retail',
    experience_level: 'intermediate',
    website: '',
    twitter: '',
    linkedin: '',

    email_digest_frequency: 'weekly',
    email_transactional_confirmations: true,
    email_security_alerts: true,
    email_marketing: false,

    security_two_factor: false,
    security_login_alerts: true,
  };
}

