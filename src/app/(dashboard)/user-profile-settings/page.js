'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/community.css';

export default function UserProfileSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.user_metadata?.first_name || 'John',
    lastName: user?.user_metadata?.last_name || 'Doe',
    email: user?.email || 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'Investment analyst with 5+ years of experience in financial markets and portfolio management.',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    trading: true,
  });
  const [saved, setSaved] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const handleResetPassword = async () => {
    setResetLoading(true);
    setResetMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser?.email) throw new Error('No user email available');
      const { error } = await supabase.auth.resetPasswordForEmail(authUser.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setResetMessage({
        type: 'success',
        text: `Password reset link sent to ${authUser.email}. Check your inbox.`,
      });
    } catch (err) {
      setResetMessage({
        type: 'error',
        text: err.message || 'Failed to send reset link. Please try again.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!user) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in to view profile</h2>
          <Link href="/signin" className="text-primary hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-settings-page">
      <div className="py-12">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-page-title font-light text-foreground tracking-tight page-title-shiny">
              Profile Settings
            </h1>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg">
              Manage your account preferences and personal information
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-300 shadow-lg">
              <i className="bi bi-check-lg mr-2" />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="component-card p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mr-4">
                  <i className="bi bi-person text-primary-foreground text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-foreground">Personal Information</h2>
                  <p className="text-muted-foreground">Update your personal details and contact information</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl opacity-80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="component-card p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center mr-4">
                  <i className="bi bi-shield-lock text-accent-foreground text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-foreground">Account Security</h2>
                  <p className="text-muted-foreground">Manage your password and security preferences</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Send a password reset link to your email. You&apos;ll set a new password on the secure page we open from the link.
                </p>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="inline-flex items-center px-6 py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i className="bi bi-key mr-2" />
                  {resetLoading ? 'Sending…' : 'Reset Password'}
                </button>
                {resetMessage && (
                  <p
                    className={`text-sm ${resetMessage.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
                    role="status"
                  >
                    {resetMessage.text}
                  </p>
                )}
              </div>
            </div>

            <div className="component-card p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mr-4">
                  <i className="bi bi-bell text-primary-foreground text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-foreground">Notification Preferences</h2>
                  <p className="text-muted-foreground">Choose how you want to be notified about important updates</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={notifications.email}
                      onChange={(e) => setNotifications((n) => ({ ...n, email: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="emailNotifications" className="sr-only">Email Notifications</label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Push Notifications</h3>
                    <p className="text-sm text-muted-foreground">Get real-time alerts on your device</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pushNotifications"
                      checked={notifications.push}
                      onChange={(e) => setNotifications((n) => ({ ...n, push: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="pushNotifications" className="sr-only">Push Notifications</label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Trading Alerts</h3>
                    <p className="text-sm text-muted-foreground">Notifications for congressional trading activity</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="tradingNotifications"
                      checked={notifications.trading}
                      onChange={(e) => setNotifications((n) => ({ ...n, trading: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="tradingNotifications" className="sr-only">Trading Alerts</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="component-card p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="component-card p-8 mt-8 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="bi bi-shield-lock text-primary text-xl" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground mb-2">Privacy &amp; personal data</h2>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                Submit a request to view, update, or delete personal information we hold about your account
                (including partner and organization roles). This opens the same Privacy &amp; data section as
                the main Settings page.
              </p>
              <Link
                href="/settings?tab=privacy-data"
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                Open data requests in Settings
                <i className="bi bi-arrow-right" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
