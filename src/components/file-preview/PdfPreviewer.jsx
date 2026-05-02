'use client';

import { useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import '@/lib/pdf-worker-setup';

export function PdfPreviewer({ file }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState(null);

  const onDocLoad = useCallback(({ numPages: n }) => {
    setNumPages(n);
    setError(null);
  }, []);

  const onDocError = useCallback((err) => {
    console.error('[PdfPreviewer] load error', err);
    setError(err?.message || 'Failed to load PDF');
  }, []);

  if (error) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ef4444' }}>
        <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }} />
        <p>Could not load PDF: {error}</p>
      </div>
    );
  }

  if (!file.previewUrl) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#8b949e' }}>
        <i className="bi bi-file-earmark-pdf" style={{ fontSize: '3rem', color: '#dc2626', display: 'block', marginBottom: '0.75rem' }} />
        <p style={{ color: '#c9d1d9', marginBottom: '0.5rem' }}>Demo file — no PDF binary available</p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Real uploads will render here as a scrollable PDF with page navigation and zoom.
        </p>
      </div>
    );
  }

  return (
    <div className="fp-pdf-wrap">
      <div className="fp-pdf-toolbar">
        <button
          type="button"
          className="fp-toolbar-btn"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          aria-label="Previous page"
        >
          <i className="bi bi-chevron-left" />
        </button>
        <span className="fp-page-counter">
          {pageNumber} / {numPages || '–'}
        </span>
        <button
          type="button"
          className="fp-toolbar-btn"
          disabled={!numPages || pageNumber >= numPages}
          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          aria-label="Next page"
        >
          <i className="bi bi-chevron-right" />
        </button>
        <span className="fp-toolbar-divider" />
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          aria-label="Zoom out"
          disabled={scale <= 0.5}
        >
          <i className="bi bi-zoom-out" />
        </button>
        <span className="fp-zoom-label">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
          aria-label="Zoom in"
          disabled={scale >= 2.5}
        >
          <i className="bi bi-zoom-in" />
        </button>
        <button type="button" className="fp-toolbar-btn" onClick={() => setScale(1)} aria-label="Reset zoom">
          Reset
        </button>
      </div>
      <div className="fp-pdf-scroll">
        <Document
          file={file.previewUrl}
          onLoadSuccess={onDocLoad}
          onLoadError={onDocError}
          loading={
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#8b949e' }}>
              <i className="bi bi-hourglass-split" /> Loading PDF…
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer
            renderAnnotationLayer
            className="fp-pdf-page"
          />
        </Document>
      </div>
    </div>
  );
}
