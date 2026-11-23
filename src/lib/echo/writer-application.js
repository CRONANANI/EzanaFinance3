/**
 * Echo Writer application rules (Nov 23 2026). One definition shared by the
 * form (src/components/echo/WriterApplication.jsx) and the API
 * (src/app/api/echo/writer-application/route.js), so the form never accepts
 * something the server then rejects, and the Help Center article
 * ("Applying to Write for Ezana Echo") can describe exactly these rules.
 *
 *   writingExperience  required, 40 to 5,000 characters
 *   sampleUrls         required, 2 to 5 links, one per line, each http(s)
 *   portfolioUrl       optional, http(s) when given
 *   specialization     optional, one of SPECIALIZATIONS
 *   reasonToWrite      optional, up to 2,000 characters
 *
 * The server checks that a link is a well-formed web address. It does not
 * open the link, so it cannot tell whether a page is public or still online.
 */

export const LIMITS = {
  experienceMin: 40,
  experienceMax: 5000,
  samplesMin: 2,
  samplesMax: 5,
  reasonMax: 2000,
  urlMax: 500,
};

export const SPECIALIZATIONS = [
  { value: 'markets', label: 'Market Analysis' },
  { value: 'investing', label: 'Investing & Portfolio' },
  { value: 'trading', label: 'Trading Strategies' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'economy', label: 'Economy & Policy' },
  { value: 'education', label: 'Financial Education' },
  { value: 'politics', label: 'Politics & Markets' },
];

/** True for an absolute http(s) URL with a dotted host. */
export function isWebUrl(value) {
  const v = String(value || '').trim();
  if (!v || v.length > LIMITS.urlMax) return false;
  try {
    const u = new URL(v);
    return (u.protocol === 'https:' || u.protocol === 'http:') && /\.[a-z]{2,}$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Sample links from a textarea (one per line) or an array. Blank lines drop. */
export function parseSampleUrls(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(/\r?\n/);
  return list.map((s) => String(s || '').trim()).filter(Boolean);
}

/**
 * Validates a submitted application.
 * @returns {{ ok: boolean, errors: Record<string,string>, value: object }}
 *   errors are keyed by field and written to be shown next to that field.
 */
export function validateWriterApplication(input = {}) {
  const errors = {};
  const experience = String(input.writingExperience || '').trim();
  const samples = parseSampleUrls(input.sampleUrls);
  const portfolio = String(input.portfolioUrl || '').trim();
  const reason = String(input.reasonToWrite || '').trim();
  const specialization = String(input.specialization || '').trim();

  if (!experience) {
    errors.writingExperience = 'Describe your writing experience.';
  } else if (experience.length < LIMITS.experienceMin) {
    errors.writingExperience = `Add a little more detail: at least ${LIMITS.experienceMin} characters (you have ${experience.length}).`;
  } else if (experience.length > LIMITS.experienceMax) {
    errors.writingExperience = `Keep this under ${LIMITS.experienceMax.toLocaleString('en-US')} characters (you have ${experience.length.toLocaleString('en-US')}).`;
  }

  const badLinks = samples.filter((s) => !isWebUrl(s));
  if (samples.length < LIMITS.samplesMin) {
    errors.sampleUrls = `Add at least ${LIMITS.samplesMin} links to articles you have written, one per line.`;
  } else if (samples.length > LIMITS.samplesMax) {
    errors.sampleUrls = `Add at most ${LIMITS.samplesMax} links (you have ${samples.length}).`;
  } else if (badLinks.length) {
    errors.sampleUrls = `Each link must be a full web address starting with https:// or http://. Check: ${badLinks
      .slice(0, 2)
      .map((s) => (s.length > 60 ? `${s.slice(0, 57)}...` : s))
      .join(', ')}`;
  }

  if (portfolio && !isWebUrl(portfolio)) {
    errors.portfolioUrl =
      'Use a full web address starting with https:// or http://, or leave this blank.';
  }
  if (specialization && !SPECIALIZATIONS.some((s) => s.value === specialization)) {
    errors.specialization = 'Choose a specialization from the list.';
  }
  if (reason.length > LIMITS.reasonMax) {
    errors.reasonToWrite = `Keep this under ${LIMITS.reasonMax.toLocaleString('en-US')} characters.`;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      writingExperience: experience,
      sampleUrls: samples,
      portfolioUrl: portfolio || null,
      specialization: specialization || null,
      reasonToWrite: reason || null,
    },
  };
}
