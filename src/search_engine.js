import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import {
  SEARCH_QUERY,
  SEARCH_QUERY_JOB_BOARDS,
  JOB_BOARD_DOMAINS,
  GENERAL_SEARCH_EXCLUDE_DOMAINS,
  SEARCH_MAX_RESULTS,
} from './config.js';
dotenv.config();

// Path endings that indicate a category/listing page rather than a specific job ad.
const LISTING_ENDINGS = new Set(['jobs', 'careers', 'openings', 'positions', 'vacancies', 'opportunities']);

/**
 * Returns true if the URL looks like a specific job posting rather than a listing or category page.
 * Heuristic: needs at least 2 path segments, must not end on a generic word, and must not
 * pass through known listing-page path patterns (e.g. /categories/).
 */
function isSpecificJobUrl(url) {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);

    // Root or single-segment paths are always listing/category pages
    if (segments.length < 2) return false;

    // WeWorkRemotely /categories/remote-*-jobs and similar patterns
    if (pathname.toLowerCase().includes('/categories/')) return false;

    const lastSegment = segments[segments.length - 1].toLowerCase();

    // Ends on a bare generic word (e.g. /jobs, /careers)
    if (LISTING_ENDINGS.has(lastSegment)) return false;

    // Any slug ending in "-jobs" is a category/listing page (e.g. /remote-dev-jobs, /remote-senior-software-engineer-jobs)
    if (lastSegment.endsWith('-jobs')) return false;

    // /remote-jobs/<slug> where slug is a short generic role name (e.g. remote.co/remote-jobs/developer)
    // Specific job slugs are always long compound strings (30+ chars); category names are short.
    if (segments[0].toLowerCase() === 'remote-jobs' && segments.length === 2 && lastSegment.length < 25) return false;

    return true;
  } catch {
    return true; // unparseable URL — let it through and let dedup handle it later
  }
}

/**
 * Searches for senior remote software engineering job listings.
 * Runs two parallel Tavily queries — a broad web search and a job-board-targeted search —
 * then merges, deduplicates by URL, and filters out listing/category pages.
 *
 * @returns {Promise<Array<{title: string, url: string, content: string}>>}
 */
export async function searchJobs() {
  const apiKey = process.env.TAVILY_API_KEY?.trim();

  if (!apiKey) {
    console.error('❌ Error: TAVILY_API_KEY missing from .env');
    return [];
  }

  const tvly = tavily({ apiKey });

  try {
    const [generalResponse, boardsResponse] = await Promise.all([
      tvly.search(SEARCH_QUERY, {
        searchDepth: 'advanced',
        maxResults: SEARCH_MAX_RESULTS,
        excludeDomains: GENERAL_SEARCH_EXCLUDE_DOMAINS,
      }),
      tvly.search(SEARCH_QUERY_JOB_BOARDS, {
        searchDepth: 'advanced',
        maxResults: SEARCH_MAX_RESULTS,
        includeDomains: JOB_BOARD_DOMAINS,
      }),
    ]);

    const allResults = [
      ...(generalResponse?.results ?? []),
      ...(boardsResponse?.results ?? []),
    ];

    const seenUrls = new Set();
    return allResults
      .filter(r => {
        if (!r.url || seenUrls.has(r.url)) return false;
        if (!isSpecificJobUrl(r.url)) return false;
        seenUrls.add(r.url);
        return true;
      })
      .map(r => ({
        title: r.title || 'Title not available',
        url: r.url,
        content: r.content || '',
      }));

  } catch (error) {
    console.error('❌ Error during Tavily search:', error.message);
    return [];
  }
}
