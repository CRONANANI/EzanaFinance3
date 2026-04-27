'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export function MessagesHeader() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, user_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setProfile(data || null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const displayName =
    profile?.full_name ||
    profile?.user_settings?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'You';

  return (
    <header className="m-header">
      <div className="m-header__title-wrap">
        <h1 className="m-header__title">Messages</h1>
        <p className="m-header__subtitle">Handle all messages and alerts in one place.</p>
      </div>

      <div className="m-header__actions">
        <div className="m-header__user">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="m-online__avatar-img"
              style={{ width: 36, height: 36 }}
            />
          ) : (
            <div className="m-online__avatar-fallback" aria-hidden>
              {getInitials(displayName)}
            </div>
          )}
          <div className="m-header__user-meta">
            <div className="m-header__user-name">{displayName}</div>
            <div className="m-header__user-email">{user?.email || ''}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
