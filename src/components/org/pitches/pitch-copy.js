/**
 * Server messages for the cases a member can cause, in plain words. Anything
 * else gets the caller's fallback, so no internal text reaches the page.
 */
export function say(error, fallback) {
  const e = String(error || '');
  if (!e) return fallback;
  if (/Gates failing/i.test(e)) return 'A gate is not met yet. The latest state is shown.';
  if (/Override reason/i.test(e)) return 'Write a reason of at least 20 characters.';
  if (/cannot be overridden/i.test(e)) return 'This stage cannot be overridden.';
  if (/frozen/i.test(e)) return 'The thesis is frozen from Cross-desk review onward.';
  if (/Only the authoring analyst/i.test(e))
    return 'Only the author or a manager can edit this thesis.';
  if (/Voting is closed/i.test(e)) return 'The vote has closed.';
  if (/Voting is not open/i.test(e)) return 'Voting is not open for this pitch.';
  if (/rationale required|rationale/i.test(e) && /required/i.test(e)) return 'Write a rationale.';
  if (/objection requires/i.test(e))
    return 'An objection needs a reason of at least 10 characters.';
  if (/pitching desk cannot/i.test(e)) return 'The pitching desk cannot review its own pitch.';
  if (/attendees/i.test(e)) return 'A desk meeting needs at least 3 attendees.';
  if (/Field "(\w+)"/.test(e)) return 'Fill in every field of the desk meeting record.';
  if (/sizing/i.test(e)) return 'Enter the proposed position size as a number.';
  if (/held_at/i.test(e)) return 'Enter when the desk meeting was held.';
  if (/Upload the model/i.test(e)) return 'Add the model link before marking it reviewed.';
  if (/file_url/i.test(e)) return 'Enter a link to the model.';
  if (/Cannot move a/i.test(e)) return 'The meeting has moved on since the page loaded.';
  if (/meeting is closed/i.test(e)) return 'That meeting is closed.';
  if (/detach/i.test(e)) return 'A pitch cannot leave its meeting while the vote is open.';
  if (/onboarding/i.test(e))
    return 'Complete your required onboarding tasks before submitting a live pitch.';
  if (/IPS|policy limit/i.test(e)) return 'This pitch breaches a hard investment policy limit.';
  if (/ticker, pitch_type/i.test(e)) return 'Enter a ticker and a short thesis.';
  if (/connect/i.test(e)) return 'Could not connect. Nothing was changed.';
  if (
    /role|Only|Not eligible|Executives only|Managers only|Not allowed|Missing permission/i.test(e)
  ) {
    return 'Your role cannot take this step.';
  }
  return fallback;
}
