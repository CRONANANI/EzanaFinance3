'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HomeDashboardPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin');
        return;
      }
      setUser(session.user);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (!error && profileData) setProfile(profileData);
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-muted-foreground text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Welcome, {profile?.full_name || user?.user_metadata?.full_name || user?.email}!
        </h2>
        <div className="flex items-center gap-4 text-muted-foreground">
          {profile?.legacy_number && (
            <>
              <span>Legacy User #{profile.legacy_number}</span>
              <span>•</span>
            </>
          )}
          <span>Lifetime Free Access</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Congressional Trades</h3>
          <p className="text-3xl font-bold text-primary">—</p>
          <p className="text-muted-foreground text-sm mt-2">Tracked this month</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Watchlist</h3>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-muted-foreground text-sm mt-2">Stocks tracked</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Alerts</h3>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-muted-foreground text-sm mt-2">Active alerts</p>
        </div>
      </div>

      <div className="mt-8 bg-card border border-border rounded-lg p-8 text-center">
        <h3 className="text-xl font-bold mb-2">Dashboard Coming Soon</h3>
        <p className="text-muted-foreground">
          We&apos;re building your investment intelligence dashboard. You&apos;ll soon have access to
          congressional trades, 13F filings, and more.
        </p>
      </div>
    </div>
  );
}
