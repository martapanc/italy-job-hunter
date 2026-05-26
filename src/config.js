/** Primary Tavily query for senior remote software engineering listings (broad web search). */
export const SEARCH_QUERY =
  '"software engineer" OR "senior software engineer" OR "lead software engineer" OR "staff engineer" "fully remote" (full-stack OR backend OR frontend) -junior -graduate';

/** Secondary Tavily query scoped to major remote job boards via includeDomains. */
export const SEARCH_QUERY_JOB_BOARDS =
  '"software engineer" "fully remote" "apply" OR "apply now" OR "job description"';

/** Domains included in the secondary job-board search. */
export const JOB_BOARD_DOMAINS = [
  'remoteok.com',
  'weworkremotely.com',
  'wellfound.com',
  'greenhouse.io',
  'lever.co',
  'jobs.ashbyhq.com',
];

/**
 * Domains excluded from the general web search.
 * These aggregators only surface listing/search pages via Tavily; individual job ads
 * are behind login walls and are not accessible to the search crawler.
 */
export const GENERAL_SEARCH_EXCLUDE_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'ziprecruiter.com',
  'glassdoor.com',
  'arc.dev',
];

/**
 * Maximum raw results per Tavily query.
 * Two queries run per hunt (broad + job boards); total before dedup = 2x this value.
 */
export const SEARCH_MAX_RESULTS = 12;

/** Tavily query for scouting remote-first tech companies worldwide. */
export const SCOUT_QUERY =
  '"remote-first" OR "fully remote" ("software company" OR "product company" OR "tech startup") "we are hiring" OR "open positions" senior engineer';

/** Maximum companies to fetch per scouting run. */
export const SCOUT_MAX_RESULTS = 6;

/** Groq model used for the boolean triage filter. */
export const TRIAGE_MODEL = 'llama-3.1-8b-instant';

/** Ollama base URL (OpenAI-compatible). Change if Ollama runs on a different host/port. */
export const OLLAMA_BASE_URL = 'http://localhost:11434';

/** Ollama model for CV match analysis and pitch generation. Must be pulled locally via `ollama pull <model>`. */
export const OLLAMA_MODEL = 'deepseek-r1:latest';

/** Delay in milliseconds between consecutive API calls to respect Groq rate limits. */
export const API_DELAY_MS = 2500;

/** Maximum character count per Telegram message chunk. Telegram hard limit is 4096. */
export const TELEGRAM_MAX_CHARS = 4000;

/**
 * Minimum match score (0–100) required to include a listing in the Telegram report.
 * Listings analysed by Ollama but scoring below this threshold are silently dropped.
 */
export const MIN_MATCH_SCORE = 60;
