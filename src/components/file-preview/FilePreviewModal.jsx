'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import './file-preview.css';

const PdfPreviewer = dynamic(() => import('./PdfPreviewer').then((m) => m.PdfPreviewer), {
  ssr: false,
  loading: () => <PreviewLoading label="Loading PDF…" />,
});
const PptxPreviewer = dynamic(() => import('./PptxPreviewer').then((m) => m.PptxPreviewer), {
  ssr: false,
  loading: () => <PreviewLoading label="Loading slides…" />,
});
const VideoPreviewer = dynamic(() => import('./VideoPreviewer').then((m) => m.VideoPreviewer), {
  ssr: false,
  loading: () => <PreviewLoading label="Loading video…" />,
});

function PreviewLoading({ label }) {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#8b949e' }}>
      <i className="bi bi-hourglass-split" style={{ fontSize: '1.5rem' }} /> {label}
    </div>
  );
}

function getFileExt(name) {
  return (name.split('.').pop() || '').toLowerCase();
}

export function FilePreviewModal({ file, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!file) return null;

  const ext = getFileExt(file.name);

  let body;
  if (ext === 'pdf') {
    body = <PdfPreviewer file={file} />;
  } else if (ext === 'pptx' || ext === 'ppt') {
    body = <PptxPreviewer file={file} />;
  } else if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) {
    body = <VideoPreviewer file={file} />;
  } else {
    body = (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#8b949e' }}>
        <i className="bi bi-file-earmark-text" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }} />
        <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: '#c9d1d9' }}>
          Preview not available for <strong>{ext.toUpperCase()}</strong> files.
        </p>
        <button
          type="button"
          className="fp-action-btn"
          onClick={() => {
            if (file.previewUrl) window.open(file.previewUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          <i className="bi bi-download" /> Download
        </button>
      </div>
    );
  }

  return (
    <div className="fp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="fp-modal" role="dialog" aria-labelledby="fp-title">
        <div className="fp-header">
          <div className="fp-header-info">
            <i className={`bi ${getIconForExt(ext)}`} style={{ color: '#6366f1', fontSize: '1.1rem' }} />
            <h2 id="fp-title" className="fp-title">
              {file.name}
            </h2>
          </div>
          <button type="button" className="fp-close" onClick={onClose} aria-label="Close preview">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="fp-body">{body}</div>
      </div>
    </div>
  );
}

function getIconForExt(ext) {
  if (ext === 'pdf') return 'bi-file-earmark-pdf';
  if (['pptx', 'ppt'].includes(ext)) return 'bi-file-earmark-slides';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'bi-file-earmark-spreadsheet';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'bi-camera-video';
  if (['doc', 'docx'].includes(ext)) return 'bi-file-earmark-word';
  return 'bi-file-earmark';
}
