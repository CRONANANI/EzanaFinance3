'use client';

import { useEffect, useState } from 'react';
import { MuxVideoPlayer } from './MuxVideoPlayer';
import { VideoUploader } from './VideoUploader';
import { Badge, Button, Card, NumericValue } from '@/components/ds';
import { getVideoStatus, formatDuration } from '@/lib/video-format';

const STATUS_TONE = {
  pending: 'info',
  processing: 'warning',
  ready: 'positive',
  errored: 'negative',
};

function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'neutral'}>{getVideoStatus(status).label}</Badge>;
}

/**
 * Creator-facing video hosting: upload to Mux, watch processing status, preview
 * ready videos, copy the playback id / course embed snippet, delete. Degrades
 * to a setup notice when Mux keys are not configured.
 */
export function CreatorVideoStudio() {
  const [configured, setConfigured] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const load = async () => {
    try {
      const [statusRes, listRes] = await Promise.all([
        fetch('/api/mux/status'),
        fetch('/api/learning/videos', { cache: 'no-store' }),
      ]);
      const status = await statusRes.json().catch(() => ({ configured: false }));
      setConfigured(!!status.configured);
      if (listRes.ok) {
        const data = await listRes.json();
        setVideos(data.videos || []);
      }
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onUploaded = (video) => {
    setVideos((prev) => {
      const without = prev.filter((v) => v.id !== video.id);
      return [video, ...without];
    });
  };

  const remove = async (id) => {
    if (!confirm('Delete this video? This removes it from Mux too.')) return;
    const res = await fetch(`/api/learning/videos/${id}`, { method: 'DELETE' });
    if (res.ok) setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading video studio…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Video studio</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Upload lesson videos hosted on Mux, then embed them in your courses.
        </p>
      </div>

      {configured === false && (
        <div
          style={{
            border: '1px solid var(--gold-border)',
            background: 'var(--gold-bg)',
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Video hosting isn’t active yet.</strong>
          <p style={{ margin: '6px 0 0' }}>
            Add a Mux account and set <code>MUX_TOKEN_ID</code>, <code>MUX_TOKEN_SECRET</code> (and{' '}
            <code>MUX_WEBHOOK_SECRET</code> for the webhook at <code>/api/mux/webhook</code>) in the
            environment. Uploading and playback activate automatically once those are present — no
            code changes needed.
          </p>
        </div>
      )}

      {configured && <VideoUploader onUploaded={onUploaded} />}

      {videos.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No videos yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {videos.map((v) => {
            const embed = v.playbackId
              ? `{ "type": "video", "playbackId": "${v.playbackId}" }`
              : '';
            return (
              <Card key={v.id} pad>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {v.title}
                  </span>
                  <StatusBadge status={v.status} />
                  {v.duration ? (
                    <NumericValue colorize="muted" style={{ fontSize: 12 }}>
                      {formatDuration(v.duration)}
                    </NumericValue>
                  ) : null}
                  <span style={{ marginLeft: 'auto' }}>
                    <Button variant="ghost" size="sm" icon="bi-trash" onClick={() => remove(v.id)}>
                      Delete
                    </Button>
                  </span>
                </div>

                {v.status === 'ready' && v.playbackId ? (
                  <>
                    <MuxVideoPlayer playbackId={v.playbackId} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="bi-clipboard"
                        onClick={() => copy(embed, `embed-${v.id}`)}
                      >
                        {copied === `embed-${v.id}` ? 'Copied!' : 'Copy lesson module'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(v.playbackId, `id-${v.id}`)}
                      >
                        {copied === `id-${v.id}` ? 'Copied!' : 'Copy playback ID'}
                      </Button>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>
                      Add a <code>video</code> module (<code>{embed}</code>) to a course lesson to
                      embed this video.
                    </p>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {v.status === 'errored'
                      ? 'Processing failed — try re-uploading.'
                      : 'Processing… this can take a minute after upload.'}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
