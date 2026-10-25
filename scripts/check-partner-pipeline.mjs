#!/usr/bin/env node
/* QA audit, partner pipeline (PAR-1, PAR-10, PAR-4). Mocked Supabase and Resend.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-partner-pipeline.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  VERIFICATION_TOKEN_TTL_HOURS,
  resubmitBlock,
  submitPartnerApplication,
  resendPartnerVerification,
  RESEND_GENERIC_REPLY,
} from '../src/lib/partner-application.js';

const quiet = { info() {}, warn() {}, error() {} };
const BODY = { fullName: 'Ada Partner', email: 'Ada@Example.com ', partnerType: 'creator' };
const HOUR = 60 * 60 * 1000;

function mockResend({ fail = null } = {}) {
  const sent = [];
  return {
    sent,
    emails: {
      async send(msg) {
        sent.push(msg);
        if (fail === 'throw') throw new Error('network down');
        if (fail === 'error') return { data: null, error: { message: 'domain not verified' } };
        return { data: { id: 'em_1' }, error: null };
      },
    },
  };
}

test('PAR-1: submit sends the verification email with the real token lifetime', async () => {
  const db = createMockSupabase();
  const resend = mockResend();
  const r = await submitPartnerApplication({ db, resend, logger: quiet, body: BODY });
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(r.body.verifyUrl, undefined, 'verify URL only leaks in development');
  assert.equal(resend.sent.length, 1);
  assert.equal(resend.sent[0].to, 'ada@example.com');
  assert.match(resend.sent[0].html, new RegExp(`expires in ${VERIFICATION_TOKEN_TTL_HOURS} hours`));
  assert.match(resend.sent[0].html, /\/auth\/partner\/apply\/verify\?token=[0-9a-f]{64}/);
});

test('PAR-1: email failure (thrown or returned) is a 502, not a silent success', async () => {
  for (const fail of ['throw', 'error']) {
    const db = createMockSupabase();
    const r = await submitPartnerApplication({
      db,
      resend: mockResend({ fail }),
      logger: quiet,
      body: BODY,
    });
    assert.equal(r.status, 502, `fail=${fail}`);
    assert.match(r.body.error, /could not send the verification email/);
  }
});

test('PAR-1: dev mode still returns the verify URL', async () => {
  const r = await submitPartnerApplication({
    db: createMockSupabase(),
    resend: mockResend(),
    logger: quiet,
    body: BODY,
    isDev: true,
  });
  assert.match(r.body.verifyUrl, /token=/);
});

test('PAR-10: only an expired pending_verification row may resubmit', () => {
  const now = Date.now();
  const past = new Date(now - HOUR).toISOString();
  const future = new Date(now + HOUR).toISOString();
  const row = (application_status, verification_token_expires) => ({
    application_status,
    verification_token_expires,
  });
  assert.equal(resubmitBlock(null, now), null);
  assert.equal(resubmitBlock(row('pending_verification', past), now), null);
  assert.equal(resubmitBlock(row('pending_verification', future), now).status, 409);
  assert.equal(resubmitBlock(row('pending_documents', past), now).status, 409);
  assert.equal(resubmitBlock(row('under_review', past), now).status, 409);
  assert.equal(resubmitBlock(row('approved', past), now).status, 409);
  assert.equal(resubmitBlock(row('rejected', past), now), null);
});

test('PAR-10: resend regenerates the token for a waiting application and sends', async () => {
  const db = createMockSupabase({
    seed: {
      partner_applications: [
        {
          id: 'app-1',
          email: 'ada@example.com',
          application_status: 'pending_verification',
          verification_token: 'old',
          verification_token_expires: new Date(Date.now() - HOUR).toISOString(),
        },
      ],
    },
  });
  const resend = mockResend();
  const r = await resendPartnerVerification({
    db,
    resend,
    logger: quiet,
    email: ' ADA@example.com',
  });
  assert.deepEqual(r, { sent: true, reason: null });
  const { data: row } = await db
    .from('partner_applications')
    .select('*')
    .eq('id', 'app-1')
    .single();
  assert.notEqual(row.verification_token, 'old');
  assert.ok(new Date(row.verification_token_expires).getTime() > Date.now());
  assert.equal(resend.sent.length, 1);
});

test('PAR-10: resend for an unknown or decided email sends nothing', async () => {
  const db = createMockSupabase({
    seed: { partner_applications: [{ id: 'a', email: 'x@y.com', application_status: 'approved' }] },
  });
  const resend = mockResend();
  for (const email of ['nobody@y.com', 'x@y.com', 'not-an-email']) {
    const r = await resendPartnerVerification({ db, resend, logger: quiet, email });
    assert.equal(r.sent, false);
  }
  assert.equal(resend.sent.length, 0);
  assert.doesNotMatch(RESEND_GENERIC_REPLY.message, /not found|no application/i);
});
