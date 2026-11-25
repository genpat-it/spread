/*
*
* Example bank matcher of the assistant.
*
* js/assistant-examples.json lists, for each catalog entry (by stable key),
* many ways people ask for it in Italian, English and French. A request is
* compared with every example by TF-IDF over character n-grams (3 to 5
* characters inside word boundaries, accents removed, sublinear term
* frequency, smoothed idf, L2 norm: the same as scikit-learn's
* TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5)) used to tune the
* threshold), and an entry scores as its best example. No model, no weights.
*
*/

const MIN_N = 3;
const MAX_N = 5;
export const TOP_K = 3;

/**
 * Lower-cases, removes accents and collapses runs of whitespace.
 * @param {string} text
 * @returns {string}
 */
function fold(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s\s+/g, ' ');
}

/**
 * Character n-grams of every word, padded with one space on each side.
 * @param {string} text
 * @returns {Map<string, number>} n-gram counts
 */
function ngrams(text) {
  const counts = new Map();
  for (const word of fold(text).split(/\s+/).filter(Boolean)) {
    const padded = Array.from(` ${word} `);
    for (let n = MIN_N; n <= MAX_N; n += 1) {
      let offset = 0;
      const add = (gram) => counts.set(gram, (counts.get(gram) || 0) + 1);
      add(padded.slice(offset, offset + n).join(''));
      while (offset + n < padded.length) {
        offset += 1;
        add(padded.slice(offset, offset + n).join(''));
      }
      // A word shorter than n yields itself once and no longer n-grams.
      if (offset === 0) break;
    }
  }
  return counts;
}

/**
 * Weighted, unit-length vector of a text over the index vocabulary.
 * @param {Map<string, number>} counts n-gram counts
 * @param {Map<string, number>} idf inverse document frequency per n-gram
 * @returns {Map<string, number>}
 */
function vector(counts, idf) {
  const out = new Map();
  let norm = 0;
  for (const [gram, count] of counts) {
    const weight = idf.get(gram);
    if (weight === undefined) continue;
    const value = (1 + Math.log(count)) * weight;
    out.set(gram, value);
    norm += value * value;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [gram, value] of out) out.set(gram, value / norm);
  return out;
}

/**
 * Builds the index over the examples of the entries present in the catalog.
 * @param {Object<string, string[]>} bank examples by stable key
 * @param {Set<string>} keys stable keys of the live catalog
 * @returns {{ passages: Array<{key: string, vector: Map<string, number>}>, idf: Map<string, number> }}
 */
export function buildIndex(bank, keys) {
  const docs = [];
  for (const [key, texts] of Object.entries(bank)) {
    if (!keys.has(key)) continue;
    for (const text of texts) docs.push({ key, counts: ngrams(text) });
  }
  const frequency = new Map();
  for (const { counts } of docs) for (const gram of counts.keys()) frequency.set(gram, (frequency.get(gram) || 0) + 1);
  const idf = new Map();
  for (const [gram, df] of frequency) idf.set(gram, Math.log((1 + docs.length) / (1 + df)) + 1);
  return { idf, passages: docs.map(({ key, counts }) => ({ key, vector: vector(counts, idf) })) };
}

/**
 * Best entries for a request. An entry scores as the mean of its TOP_K most
 * similar examples, so one stray example that shares words with the request
 * (e.g. "hide the long branches" for "hide the nodes I picked") weighs less.
 * @param {object} index result of buildIndex
 * @param {string} text the request
 * @param {number} [limit=3] number of entries returned
 * @param {number} [topK=TOP_K] examples averaged per entry
 * @returns {Array<{key: string, similarity: number}>} best first
 */
export function matchExamples(index, text, limit = 3, topK = TOP_K) {
  const query = vector(ngrams(text), index.idf);
  if (!query.size) return [];
  const scores = new Map();
  for (const { key, vector: passage } of index.passages) {
    let dot = 0;
    const [small, large] = query.size < passage.size ? [query, passage] : [passage, query];
    for (const [gram, value] of small) {
      const other = large.get(gram);
      if (other !== undefined) dot += value * other;
    }
    if (dot <= 0) continue;
    const list = scores.get(key) || [];
    list.push(dot);
    scores.set(key, list);
  }
  const ranked = [...scores.entries()].map(([key, list]) => {
    const top = list.sort((a, b) => b - a).slice(0, topK);
    while (top.length < topK) top.push(0);
    return { key, similarity: top.reduce((sum, value) => sum + value, 0) / topK };
  });
  return ranked.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/*
*
* Thresholds tuned on tests/assistant/semantic_heldout.mjs (semantic_js.mjs, K/T):
* below SIMILARITY an example is not close enough to propose; a catalog answer
* scoring STRONG_SCORE or more is trusted over the examples.
*
*/
export const SIMILARITY = 0.4;
export const STRONG_SCORE = 6;

/**
 * True when the parser's answer may be replaced by the example bank: nothing
 * found, a question or ambiguity it could not settle, or a weak catalog guess.
 * @param {object|null} result the parser's answer
 * @returns {boolean}
 */
export function isWeak(result) {
  return !result
    || Boolean(result.error && (result.source === 'question' || result.source === 'catalog'))
    || Boolean(result.actions?.length && result.source === 'catalog' && !result.slot && !(result.score >= STRONG_SCORE));
}

/**
 * Decides whether the example bank should replace the parser's answer.
 * The parser keeps structured requests (filters, column edits, statistics,
 * macros…), answers that also fill a list value, and confident catalog
 * matches. Otherwise the closest example, when close enough, is proposed.
 * @param {object} options
 * @param {object|null} options.result the parser's answer (interpret)
 * @param {Array<{key: string, similarity: number}>} options.matches matchExamples result
 * @param {object[]} options.catalog live catalog entries (with key)
 * @param {string} options.text the request
 * @param {Function} options.valueFor (entry, text) => action|null
 * @returns {{ entry: object, action: object|null, similarity: number }|null} a proposal, or null to keep the parser's answer
 */
export function proposal({ result, matches, catalog, text, valueFor }) {
  if (!isWeak(result)) return null;
  const top = matches[0];
  if (!top || top.similarity < SIMILARITY) return null;
  const entry = catalog.find((candidate) => candidate.key === top.key);
  if (!entry) return null;
  // The parser already picked the same option: nothing to propose.
  if (result?.actions?.[0]?.id === entry.id) return null;
  return { entry, action: valueFor(entry, text), similarity: top.similarity };
}
