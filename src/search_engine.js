import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import { SEARCH_QUERY, SEARCH_QUERY_JOB_BOARDS, JOB_BOARD_DOMAINS, SEARCH_MAX_RESULTS } from './config.js';
dotenv.config();

/**
 * Searches for senior remote software engineering job listings.
 * Runs two parallel Tavily queries — a broad web search and a job-board-targeted search —
 * then merges and deduplicates the results by URL.
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

    const seen = new Set();
    return allResults
      .filter(r => {
        if (!r.url || seen.has(r.url)) return false;
        seen.add(r.url);
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
