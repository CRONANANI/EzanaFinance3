'use client';

import { useRef, useState } from 'react';
import { Button, Input } from '@/components/ds';

function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

async function pollReady(id, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`/api/learning/videos/${id}`);
    if (res.ok) {
      const { video } = await res.json();
      if (video.status === 'ready' || video.status === 'errored') return video;
    }
  }
  return { id, status: 'processing' };
}

/**
 * Title + file → Mux direct upload → poll until ready. Calls onUploaded with
 * the final video record. Works without webhooks (the status route reconciles).
 */
export function VideoUploader({ onUploaded }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const busy = ['creating', 'uploading', 'processing'].includes(phase);

  const reset = () => {
    setTitle('');
    setFile(null);
    setPhase('idle');
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const start = async () => {
    if (!file) {
      setError('Choose a video file first.');
      return;
    }
    setError(null);
    setPhase('creating');
    try {
      const res = await fetch('/api/learning/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start upload');

      setPhase('uploading');
      setProgress(0);
      await putWithProgress(data.uploadUrl, file, setProgress);

      setPhase('processing');
      const video = await pollReady(data.video.id);
      if (video.status === 'ready') {
        setPhase('done');
        onUploaded?.(video);
        setTimeout(reset, 1200);
      } else {
        setPhase('error');
        setError(video.status === 'errored' ? 'Processing failed.' : 'Still processing…');
        onUploaded?.(video);
      }
    } catch (e) {
      setPhase('error');
      setError(e.message);
    }
  };

  const phaseLabel = {
    creating: 'Preparing upload…',
    uploading: `Uploading… ${progress}%`,
    processing: 'Processing video…',
    done: 'Done!',
  }[phase];

  return (
    <div
      style={{
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
        padding: 16,
        background: 'var(--surface-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Video title"
        disabled={busy}
      />
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        aria-label="Select a video file to upload"
        disabled={busy}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ fontSize: 13, color: 'var(--text-secondary)' }}
      />

      {busy && (
        <div
          style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 999 }}
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={phase === 'uploading' ? progress : phase === 'processing' ? 100 : 0}
        >
          <div
            style={{
              width: `${phase === 'uploading' ? progress : phase === 'processing' ? 100 : 10}%`,
              height: '100%',
              background: 'var(--emerald)',
              borderRadius: 999,
              transition: 'width 300ms ease',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          variant="primary"
          size="sm"
          onClick={start}
          loading={busy}
          disabled={!file}
          icon="bi-cloud-arrow-up"
        >
          {busy ? phaseLabel : 'Upload video'}
        </Button>
        {phase === 'done' && <span style={{ color: 'var(--emerald)', fontSize: 13 }}>✓ Added</span>}
        {error && <span style={{ color: 'var(--negative)', fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  );
}
