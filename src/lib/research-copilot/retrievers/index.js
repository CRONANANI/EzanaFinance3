import * as echo from './echo';
import * as markets from './markets';
import * as researchNotes from './research-notes';
import * as congress from './congress';
import * as contracts from './contracts';

/**
 * The retriever registry. Each module implements the shared contract
 * (see ./shared.js): { corpus, kind, scope, retrieve }. The orchestrator fans
 * out to every retriever the caller is allowed to use.
 */
export const RETRIEVERS = [echo, markets, researchNotes, congress, contracts];

export const CORPUS_LABELS = {
  research_notes: 'Research notes',
  echo: 'Ezana Echo',
  markets: 'Prediction markets',
  congress: 'Congressional trades',
  contracts: 'Government contracts',
};
