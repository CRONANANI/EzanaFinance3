/**
 * Sonar exposure pings (Nov 3): "How exposed is Nvidia to China export
 * controls?" is about Nvidia with China as context, the brief never asks the
 * visitor a question, and the sanctions panel is titled and focused for the
 * ping.
 *   npm run test:sonar-exposure
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { mentionedCompany } = await import('@/lib/sonar/company-mentions');
const { stripCoverageNotes } = await import('@/lib/sonar/groundingGuard');
const { sanctionsTitle } = await import('@/lib/sonar/landing-research');

test('a company named in words is found, whole words only', () => {
  assert.deepEqual(mentionedCompany('How exposed is Nvidia to China export controls?'), {
    ticker: 'NVDA',
    name: 'NVIDIA',
    surface: 'Nvidia',
  });
  assert.equal(mentionedCompany('lockheed martin government contracts')?.ticker, 'LMT');
  assert.equal(mentionedCompany('What is Berkshire Hathaway buying?')?.ticker, 'BRK.B');
  assert.equal(mentionedCompany('Bank of America earnings')?.ticker, 'BAC');
  assert.equal(mentionedCompany('deforestation in the Amazon rainforest'), null);
  assert.equal(mentionedCompany('can I afford a house'), null, 'afford is not Ford');
  assert.equal(mentionedCompany('target date funds'), null);
  assert.equal(mentionedCompany('brazil economy outlook'), null);
});

test('a brief never asks the visitor anything', () => {
  const draft = [
    "I'd be happy to help, but your ping doesn't include a specific question. NVIDIA earned 13% of revenue in China [S2].",
    'Are you asking about the scope of current China-related sanctions listings? Please rephrase your question and I will answer it directly.',
  ].join('\n\n');
  assert.equal(stripCoverageNotes(draft), 'NVIDIA earned 13% of revenue in China [S2].');
});

test('the sanctions map title follows the ping', () => {
  const china = { label: 'China' };
  assert.equal(
    sanctionsTitle({ query: 'How exposed is Nvidia to China export controls?', focus: china }),
    'China, chips and US sanctions',
  );
  assert.equal(
    sanctionsTitle({ query: 'Iran sanctions', focus: { label: 'Iran' } }),
    'Iran on the US sanctions list',
  );
  assert.equal(
    sanctionsTitle({ query: 'semiconductor export controls' }),
    'Chips and US sanctions',
  );
  assert.equal(sanctionsTitle({ query: 'who is on the SDN list' }), 'Where US sanctions land');
});
