'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import './community-social-connect.css';

const PLATFORMS = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'bi-twitter-x',
    iconColor: '#e7e9ea',
    wrapBg: 'rgba(29, 155, 240, 0.15)',
    wrapBorder: 'rgba(29, 155, 240, 0.35)',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'bi-instagram',
    iconColor: '#f77737',
    wrapBg: 'linear-gradient(135deg, rgba(225, 48, 108, 0.18) 0%, rgba(253, 203, 88, 0.12) 100%)',
    wrapBorder: 'rgba(225, 48, 108, 0.35)',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'bi-facebook',
    iconColor: '#8b9dc3',
    wrapBg: 'rgba(24, 119, 242, 0.15)',
    wrapBorder: 'rgba(24, 119, 242, 0.35)',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'bi-tiktok',
    iconColor: '#69c9d0',
    wrapBg: 'rgba(105, 201, 208, 0.12)',
    wrapBorder: 'rgba(238, 29, 82, 0.25)',
  },
];

/**
 * @param {{ variant?: 'user' | 'partner' }} props
 */
export function CommunitySocialConnectCard({ variant = 'user' }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(() =>
    Object.fromEntries(PLATFORMS.map((p) => [p.id, false]))
  );

  const isPartner = variant === 'partner';
  const rootClass = `comm-social-connect comm-social-connect--${isPartner ? 'partner' : 'user'}`;
  const cardClass = isPartner ? `ptr-card ${rootClass}` : `db-card ${rootClass}`;

  const onToggle = useCallback(
    (platformId) => {
      if (!user) {
        toast.info('Sign in to link social accounts.');
        return;
      }
      setConnected((prev) => {
        const next = !prev[platformId];
        if (next) {
          toast.success('Saved locally. Full OAuth linking is coming soon.');
        } else {
          toast.info('Disconnected (local preview).');
        }
        return { ...prev, [platformId]: next };
      });
    },
    [user, toast]
  );

  return (
    <div className={cardClass}>
      <div className="comm-social-connect__header">
        <h3 className="comm-social-connect__title">Social profiles</h3>
        <p className="comm-social-connect__subtitle">
          Link your networks so the community can find and verify you across channels.
        </p>
      </div>
      <div className="comm-social-connect__list">
        {PLATFORMS.map((p) => {
          const isOn = connected[p.id];
          return (
            <div key={p.id} className="comm-social-connect__row">
              <div
                className="comm-social-connect__icon-wrap"
                style={{
                  background: p.wrapBg,
                  borderColor: p.wrapBorder,
                }}
              >
                <i className={`bi ${p.icon}`} style={{ color: p.iconColor }} aria-hidden />
              </div>
              <div className="comm-social-connect__meta">
                <span className="comm-social-connect__name">{p.name}</span>
                <span className="comm-social-connect__hint">
                  {isOn ? 'Linked on this device (preview)' : 'Not connected'}
                </span>
              </div>
              <button
                type="button"
                className={`comm-social-connect__action${isOn ? ' comm-social-connect__action--connected' : ''}`}
                onClick={() => onToggle(p.id)}
                aria-label={isOn ? `Disconnect ${p.name}` : `Connect ${p.name}`}
              >
                {isOn ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
