// Help center follow-up suggestions (src/lib/help-center/follow-ups.js). node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  articleQuestions,
  articleText,
  helpFollowUps,
} from '../src/lib/help-center/follow-ups.js';

test('extracts authored questions from article HTML', () => {
  const text = articleText([
    '<p><strong>Q:</strong> Do I get a refund?</p><p>A: No.</p>',
    '<p><strong>Q:</strong> Can I resubscribe later?</p><p>A: Yes.</p>',
  ]);
  assert.deepEqual(articleQuestions(text), ['Do I get a refund?', 'Can I resubscribe later?']);
});

test('suggestions come from the matched articles and relate to the search', () => {
  const arts = [
    {
      text: 'Cancel steps. Q: Do I get a refund? A: No. Q: Can I resubscribe later? A: Yes. Q: Does canceling delete my account? A: No.',
    },
    { text: 'Delete. Q: Can I undo a deletion? A: No.' },
    { text: 'Trial. Q: Will I be charged when the trial ends? A: Yes.' },
  ];
  const out = helpFollowUps('cancel my plan', arts);
  assert.equal(out.length, 3);
  assert.ok(out.includes('Does canceling delete my account?'));
  assert.equal(out[0], 'Does canceling delete my account?');
  assert.ok(!out.some((q) => /SnapTrade/.test(q)));
});

test('the reader’s own question, reworded, is not suggested', () => {
  const out = helpFollowUps('How do I cancel my subscription?', [
    { text: 'Q: How do I cancel my subscription? A: x. Q: Do I get a refund? A: y.' },
  ]);
  assert.deepEqual(out, ['Do I get a refund?']);
});

test('no questions in the articles: no suggestions', () => {
  assert.deepEqual(helpFollowUps('anything', [{ text: 'plain text' }]), []);
});
