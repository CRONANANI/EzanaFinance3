/**
 * Brazil in the politician tracker: officeholders' declared assets
 * (declaração de bens) filed with the Superior Electoral Court (TSE) when
 * they register as candidates. Pure helpers shared by the ingest script
 * (scripts/ingest-tse-assets.mjs), the API routes and the tracker UI. No
 * imports, so the Node script can load this file directly.
 *
 * TSE open data, the same files the electionsBR R package reads:
 *   https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_<year>.zip
 *   https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_<year>.zip
 * Semicolon-separated CSV, Latin-1, one file per state plus a national file
 * in recent years. Values use a decimal comma.
 */

export const TSE_CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
export const TSE_DATASET_URL = (year) =>
  `https://dadosabertos.tse.jus.br/dataset/candidatos-${year}`;

/** Offices kept, as DS_CARGO is filed, with the English label and an order. */
export const BR_OFFICES = {
  PRESIDENTE: { label: 'President', short: 'President', order: 0 },
  GOVERNADOR: { label: 'Governor', short: 'Governors', order: 1 },
  SENADOR: { label: 'Senator', short: 'Senators', order: 2 },
  'DEPUTADO FEDERAL': { label: 'Federal deputy', short: 'Federal deputies', order: 3 },
  'DEPUTADO ESTADUAL': { label: 'State deputy', short: 'State deputies', order: 4 },
  'DEPUTADO DISTRITAL': { label: 'District deputy', short: 'District deputies', order: 5 },
};

export const BR_UF = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
  BR: 'National',
};

/** Combining diacritical marks, removed after NFD to strip accents. */
export const DIACRITICS = /[̀-ͯ]/g;

/** Upper case, accents stripped, single spaces. */
export function normName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/* TSE placeholders for "not informed". */
const NULLS = new Set(['', '#NULO#', '#NULO', '#NE#', '#NE', '-1', '-3', '-4', 'NAO DIVULGAVEL']);
export const tseText = (v) => {
  const s = String(v ?? '').trim();
  return NULLS.has(normName(s)) ? null : s;
};

/** '1.234.567,89' or '1234567,89' or '1234567.89' to a number; null if not one. */
export function tseNumber(v) {
  const s = tseText(v);
  if (!s) return null;
  const t = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 'dd/mm/yyyy' to 'yyyy-mm-dd'; null if not a date. */
export function tseDate(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** DS_SIT_TOT_TURNO starting ELEITO (ELEITO, ELEITO POR QP, ELEITO POR MEDIA). */
export const isElected = (situacao) => normName(situacao).startsWith('ELEITO');

/** Plain-English asset groups over the TSE's DS_TIPO_BEM_CANDIDATO text. */
const GROUPS = [
  ['Company stakes', /QUOTAS|QUINHOES|PARTICIPAC|ACOES|ACAO |EMPRESA/],
  [
    'Real estate',
    /APARTAMENTO|CASA|TERRENO|IMOVEL|IMOVEIS|SALA|LOJA|PREDIO|FAZENDA|SITIO|CHACARA|GLEBA|GALPAO|CONSTRUC|BENFEITORIA|TERRA NUA/,
  ],
  ['Vehicles, boats and aircraft', /VEICULO|AUTOMOVEL|AERONAVE|EMBARCAC|MOTO|CAMINHAO/],
  ['Bank deposits and cash', /DEPOSITO|CONTA CORRENTE|POUPANCA|DINHEIRO|ESPECIE|MOEDA/],
  [
    'Investments',
    /APLICAC|RENDA FIXA|RENDA VARIAVEL|FUNDO|TITULO|PREVIDENCIA|VGBL|PGBL|CRIPTO|OURO|TESOURO|LETRA|DEBENTURE/,
  ],
  ['Loans and credits', /CREDITO|EMPRESTIMO|CONSORCIO|MUTUO/],
];
export function assetGroup(dsTipo) {
  const t = normName(dsTipo);
  for (const [label, re] of GROUPS) if (re.test(t)) return label;
  return 'Other';
}

/** 'R$ 1.2M' style, for tables. */
export function brlShort(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  const a = Math.abs(n);
  if (a >= 1e9) return `R$ ${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `R$ ${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `R$ ${Math.round(n / 1e3)}K`;
  return `R$ ${Math.round(n)}`;
}

/** 'R$ 1,234,567.89' in full, for itemised assets. */
export function brlFull(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  return `R$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 'Federal deputy · SP' and similar. */
export function brSeat(c) {
  const office = BR_OFFICES[c?.cargo]?.label || c?.cargo || '';
  return c?.sg_uf && c.sg_uf !== 'BR' ? `${office} · ${c.sg_uf}` : office;
}

/** Title case for names filed in capitals ('JOSE DA SILVA' to 'Jose da Silva'). */
export function titleName(s) {
  const small = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E']);
  return String(s ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) =>
      i > 0 && small.has(w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
}
