import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import { SCOUT_QUERY, SCOUT_MAX_RESULTS } from './config.js';
dotenv.config();

/**
 * Searches for remote-first tech companies worldwide that plausibly hire senior engineers.
 *
 * @returns {Promise<Array<{name: string, url: string, content: string}>>}
 */
export async function scoutCompanies() {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    console.error('❌ Error: TAVILY_API_KEY missing from .env');
    return [];
  }

  const tvly = tavily({ apiKey });

  try {
    const response = await tvly.search(SCOUT_QUERY, {
      searchDepth: 'advanced',
      maxResults: SCOUT_MAX_RESULTS,
    });

    if (!response || !response.results) return [];

    return response.results.map(result => ({
      name: result.title || 'Unknown Company',
      url: result.url || '#',
      content: result.content || '',
    }));
  } catch (error) {
    console.error('❌ Error during Tavily company scouting:', error.message);
    return [];
  }
}
