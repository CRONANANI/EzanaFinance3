/**
 * Redistribute correct-answer indices across quiz options (no option text edits).
 */

const TARGETS = [2, 0, 3, 1, 0, 2, 1, 3, 2, 0];

/** @returns {{ question: string, options: string[], correctIndex: number, explanation: string }} */
export function balanceQuizQuestion(q, qIdx) {
  const cur = q.correct ?? q.correctIndex ?? 0;
  const target = TARGETS[qIdx % TARGETS.length];
  const options = [...q.options];
  if (options.length < 4) {
    return {
      question: q.question,
      options,
      correctIndex: cur,
      explanation: q.explanation,
    };
  }

  const correctText = options[cur];
  const wrongOpts = options.filter((_, i) => i !== cur);
  const rebuilt = [];
  let w = 0;
  for (let pos = 0; pos < 4; pos++) {
    if (pos === target) rebuilt.push(correctText);
    else rebuilt.push(wrongOpts[w++]);
  }

  return {
    question: q.question,
    options: rebuilt,
    correctIndex: target,
    explanation: q.explanation,
  };
}
