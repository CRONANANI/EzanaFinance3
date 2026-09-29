'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { REFERRAL_THRESHOLD, REFERRER_REWARD, REFEREE_REWARD } from '@/lib/referrals';
import './referrals-panel.css';

function fmtDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Settings, then Referrals: the user's code and share link, progress toward
 * the 5-referral reward, the people who used the code (emails masked), and
 * the reward state. Data: GET /api/referrals/me.
 */
export function ReferralsPanel() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [copied, setCopied] = useState('');
  const [canShare, setCanShare] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch('/api/referrals/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [load]);

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      setCopied('');
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: 'Join me on Ezana',
        text: `Use my code ${data.code} when you sign up for Ezana and get a free month of ${REFEREE_REWARD.planName}.`,
        url: data.shareUrl,
      });
    } catch {
      /* dismissed */
    }
  };

  if (status === 'loading') {
    return <div className="ref-panel ref-panel--loading" aria-busy="true" />;
  }
  if (status === 'error' || !data?.code) {
    return (
      <div className="ref-panel">
        <p className="ref-muted">
          Your referral code is not available right now.{' '}
          <button type="button" className="ref-link" onClick={load}>
            Try again
          </button>
        </p>
      </div>
    );
  }

  const confirmed = Math.min(data.confirmedCount, data.threshold || REFERRAL_THRESHOLD);
  const threshold = data.threshold || REFERRAL_THRESHOLD;
  const earned = data.rewardStatus === 'earned';

  return (
    <div className="ref-panel">
      <section className="ref-card">
        <p className="ref-eyebrow">Your referral code</p>
        <div className="ref-code-row">
          <span className="ref-code">{data.code}</span>
          <button type="button" className="ref-btn" onClick={() => copy(data.code, 'code')}>
            <i className={`bi ${copied === 'code' ? 'bi-check2' : 'bi-copy'}`} aria-hidden="true" />
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
        </div>
        <div className="ref-link-row">
          <span className="ref-url">{data.shareUrl}</span>
          <button type="button" className="ref-btn" onClick={() => copy(data.shareUrl, 'link')}>
            <i
              className={`bi ${copied === 'link' ? 'bi-check2' : 'bi-link-45deg'}`}
              aria-hidden="true"
            />
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
          {canShare ? (
            <button type="button" className="ref-btn ref-btn--solid" onClick={share}>
              <i className="bi bi-share" aria-hidden="true" />
              Share
            </button>
          ) : null}
        </div>
      </section>

      <section className="ref-card">
        <div className="ref-progress-head">
          <p className="ref-eyebrow">Progress</p>
          <p className="ref-count">
            <b>{confirmed}</b> / {threshold} confirmed
            {data.pendingCount ? (
              <span className="ref-muted"> · {data.pendingCount} pending</span>
            ) : null}
          </p>
        </div>
        <div
          className="ref-pips"
          role="img"
          aria-label={`${confirmed} of ${threshold} confirmed referrals`}
        >
          {Array.from({ length: threshold }).map((_, i) => (
            <span key={i} className={`ref-pip${i < confirmed ? ' is-on' : ''}`} />
          ))}
        </div>
      </section>

      <section className={`ref-card ref-reward${earned ? ' is-earned' : ''}`}>
        {earned ? (
          <p className="ref-reward-title">
            <i className="bi bi-gem" aria-hidden="true" />
            {REFERRER_REWARD.planName}, free until {fmtDate(data.rewardEndsAt)}
          </p>
        ) : (
          <>
            <p className="ref-reward-title">
              Get {threshold} confirmed sign-ups to unlock {REFERRER_REWARD.months} months of{' '}
              {REFERRER_REWARD.planName} free.
            </p>
            <p className="ref-muted">
              Each friend who signs up with your code and verifies their email counts, and gets a
              free month of {REFEREE_REWARD.planName}. Want it sooner? You can upgrade any time from{' '}
              <Link href="/settings?tab=plan" className="ref-link">
                Plan
              </Link>
              .
            </p>
          </>
        )}
      </section>

      <section className="ref-card">
        <p className="ref-eyebrow">People who used your code</p>
        {data.referees.length ? (
          <ul className="ref-list">
            {data.referees.map((r, i) => (
              <li key={`${r.maskedEmail}-${i}`} className="ref-row">
                <span className="ref-email">{r.maskedEmail}</span>
                <span className={`ref-chip ref-chip--${r.status}`}>
                  {r.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </span>
                <span className="ref-date">{fmtDate(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ref-muted">Nobody has used your code yet. Share it to get started.</p>
        )}
      </section>

      <p className="ref-muted">
        How it works, and the rules:{' '}
        <Link href="/help-center/user/article/referral-program" className="ref-link">
          the referral program
        </Link>
        .
      </p>
    </div>
  );
}

export default ReferralsPanel;
