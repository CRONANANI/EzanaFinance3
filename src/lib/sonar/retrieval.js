/**
 * Ezana Sonar — retrieval helpers that map the entitlement matrix onto the
 * existing research-copilot corpora, classify a free-text ping, and translate
 * synthesis "depth" into orchestrator budgets. Sonar is orchestration over the
 * live RAG stack, not a new retrieval engine.
 */
import { SONAR_DATASETS } from './entitlements';

/**
 * Sonar dataset id → research-copilot corpus name (the retriever that backs it).
 * Datasets without a wired retriever yet (SEC filings, 13F, lobbying,
 * partner-analytics) are intentionally absent — they show in the manifest as
 * planned but retrieve nothing until their Phase 2 retrievers land.
 */
export const DATASET_TO_CORPUS = {
  echo: 'echo',
  congress: 'congress',
  'gov-contracts': 'contracts',
  'prediction-markets': 'markets',
  'org-internal': 'research_notes',
};

/** Corpus name → the Sonar dataset id it satisfies (reverse of the above). */
export const CORPUS_TO_DATASET = Object.fromEntries(
  Object.entries(DATASET_TO_CORPUS).map(([dataset, corpus]) => [corpus, dataset]),
);

/**
 * The corpus allow-list for orchestrate(), derived from the user's entitled
 * datasets. Only entitled datasets that have a wired retriever run.
 */
export function corporaForDatasets(datasetIds) {
  const set = new Set();
  for (const id of datasetIds) {
    const corpus = DATASET_TO_CORPUS[id];
    if (corpus) set.add(corpus);
  }
  return [...set];
}

/** Synthesis depth → orchestrator budgets + LLM token ceiling. */
export function depthBudget(depth) {
  switch (depth) {
    case 'deep':
      return { topK: 16, perCorpusCap: 5, charBudget: 14000, maxTokens: 1600 };
    case 'standard':
      return { topK: 10, perCorpusCap: 4, charBudget: 9000, maxTokens: 1024 };
    case 'summary':
    default:
      return { topK: 6, perCorpusCap: 3, charBudget: 5000, maxTokens: 700 };
  }
}

/**
 * Lightweight, dependency-free classifier for the ping — decides what KIND of
 * thing was typed (informational; shown in the manifest). Heuristic by design;
 * a deeper classifier can replace this later without changing callers.
 */
export function classifyQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return 'unknown';
  if (/^@[\w.-]{2,}$/.test(q)) return 'username';
  if (/\b(?:h\.?\s?r\.?|s\.?)\s?\d{1,5}\b/i.test(q)) return 'bill';
  if (/^\$?[A-Z]{1,5}$/.test(q) && q === q.toUpperCase()) return 'ticker';
  if (/\b(act|bill|policy|regulation|tariff|sanction|executive order|rule)\b/i.test(q)) {
    return 'policy';
  }
  if (/\b(bank|capital|partners|holdings|group|inc|llc|corp|ventures|management)\b/i.test(q)) {
    return 'organization';
  }
  // A short two-token capitalized phrase reads as a person's name.
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(q)) return 'person';
  return 'entity';
}

/** Human labels for the dataset manifest, from the shared registry. */
export function datasetLabel(id) {
  return SONAR_DATASETS[id]?.label || id;
}
