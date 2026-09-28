/**
 * Shared bits for the disclosure routes. Every one of them is public read and
 * rate-limited, and every one refuses an unknown chamber rather than guessing
 * a table name from the URL.
 */
import { NextResponse } from 'next/server';
import { chamberTables } from '@/lib/disclosures/store';

export function resolveChamber(chamber) {
  return chamberTables(chamber) ? String(chamber).toLowerCase() : null;
}

export function badChamber() {
  return NextResponse.json({ error: 'Unknown chamber.' }, { status: 404 });
}

export function searchOf(request) {
  try {
    return new URL(request.url).searchParams;
  } catch {
    return new URLSearchParams();
  }
}
