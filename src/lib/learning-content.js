/**
 * Placeholder course body + quiz — merge with DB row when content is empty.
 */

import COURSE_CONTENT from './course-content';

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

/**
 * @param {{ id: string, title: string, description: string }} course
 * @returns {{ sections: Array<{ title: string, content: string, keyTerms?: string[], callout?: string }>, quiz: Array<{ question: string, options: string[], correctIndex: number, explanation: string }> }}
 */
export function buildPlaceholderContent(course) {
  const seed = hashSeed(course.id);
  const intro = `This lesson covers **${course.title}**. ${course.description} As you work through the material, focus on how these ideas connect to what you already know about markets and risk.`;

  const s2 = `In practice, investors use frameworks from this topic to make more informed decisions. Consider keeping notes on one real-world example you observe this week — that habit compounds over time.`;

  const s3 = `Before you take the quiz, recall the main idea: understanding ${course.title.toLowerCase().includes('risk') ? 'risk and discipline' : 'the core concepts'} helps you stay systematic instead of reactive.`;

  const sections = [
    {
      title: 'Introduction',
      content: intro,
      keyTerms: extractKeyTerms(course.title, seed),
    },
    {
      title: 'Core concepts',
      content: s2,
      callout:
        seed % 2 === 0
          ? 'Tip: Re-read any section where you felt uncertain — quizzes reward careful reading.'
          : 'Fun fact: Structured learning beats cramming; short sessions beat one long session.',
    },
    {
      title: 'Putting it together',
      content: s3,
    },
  ];

  const quiz = buildQuiz(course, seed);
  return { sections, quiz };
}

function extractKeyTerms(title, seed) {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 3);
  const pick = [...new Set(words)].slice(0, 4);
  if (pick.length < 2) return ['markets', 'risk', 'discipline', 'research'].slice(0, 3);
  return pick.slice(0, 4);
}

function buildQuiz(course, seed) {
  const t = course.title;
  const base = [
    {
      question: `Which best describes the primary goal of "${t}" in an investing context?`,
      options: [
        'Guaranteed profit on every trade',
        'Building a structured understanding you can apply with discipline',
        'Avoiding all losses forever',
        'Replacing the need for a brokerage account',
      ],
      correctIndex: 1,
      explanation: 'Education helps you apply concepts systematically; no strategy guarantees profits.',
    },
    {
      question: 'Why is diversification often emphasized alongside this topic?',
      options: [
        'It eliminates all market risk',
        'It can reduce idiosyncratic risk when assets are not perfectly correlated',
        'It guarantees higher returns than a single stock',
        'It removes the need for research',
      ],
      correctIndex: 1,
      explanation: 'Diversification spreads exposure; it does not remove all risk.',
    },
    {
      question: 'What is a sensible first step after finishing this lesson?',
      options: [
        'Immediately size up without a plan',
        'Write down one rule you will follow on your next research session',
        'Ignore risk management',
        'Only follow social media tips',
      ],
      correctIndex: 1,
      explanation: 'A written rule builds discipline and reinforces learning.',
    },
    {
      question: 'How should you interpret short-term market noise while learning?',
      options: [
        'As proof your thesis is always wrong',
        'As context — separate signal from emotion',
        'As a reason to stop learning',
        'As a guarantee of future returns',
      ],
      correctIndex: 1,
      explanation: 'Noise is normal; frameworks help you stay grounded.',
    },
    {
      question: 'Which habit most supports long-term compounding of knowledge?',
      options: [
        'Skipping quizzes',
        'Regular review + applying one concept at a time',
        'Only trading on impulse',
        'Avoiding all documentation',
      ],
      correctIndex: 1,
      explanation: 'Steady application beats one-time cramming.',
    },
  ];

  return base;
}

/**
 * Returns authored content for a course when present in {@link COURSE_CONTENT},
 * otherwise falls back to the procedural placeholder.
 * @param {{ id: string, title: string, description: string }} course
 */
export function getCourseContent(course) {
  const real = COURSE_CONTENT[course.id];
  if (real && Array.isArray(real.sections) && Array.isArray(real.quiz)) {
    return real;
  }
  return buildPlaceholderContent(course);
}
