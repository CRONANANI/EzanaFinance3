'use client';

import { pdfjs } from 'react-pdf';

/**
 * pdf.js worker — CDN matches installed pdfjs-dist version (react-pdf peer).
 */
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const pdfReady = true;
