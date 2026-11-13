// src/lib/sonar/saved-server.js
// Server-only helpers for saved research and share links (Sonar research workspace,
// Nov 13 2026): the caller's seat, the share token and the shared JSON response headers.

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';

export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };

/** JSON with Cache-Control: private, no-store. */
export const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: PRIVATE_HEADERS });

/** 'org' | 'partner' | 'regular', resolved the way /api/sonar/entitlements resolves it. */
export async function sonarSeat(userClient, user) {
  const member = await getCurrentOrgMember(userClient).catch(() => null);
  if (member) return 'org';
  const partner = await isActivePartner(userClient, user).catch(() => false);
  return partner ? 'partner' : 'regular';
}

/** 32 random bytes as hex, made on the server only. Never logged. */
export const newShareToken = () => crypto.randomBytes(32).toString('hex');

/** The answer when the workspace tables are not migrated yet. */
export const NOT_READY = { error: 'Saved research is not available yet.' };
