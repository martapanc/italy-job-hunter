import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import { SEARCH_QUERY, SEARCH_MAX_RESULTS } from './config.js';
dotenv.config();

/**
 * Searches the web for Full Stack (Vue.js / Nuxt / Node.js) job listings in Italy.
 * Uses Tavily's advanced search mode to retrieve rich page content for downstream filtering.
 *
 * @returns {Promise<Array<{title: string, url: string, content: string}>>}
 */
export async function cercaLavoriItalia() {
  const apiKey = process.env.TAVILY_API_KEY?.trim();

  if (!apiKey) {
    console.error('❌ Error: TAVILY_API_KEY missing from .env');
    return [];
  }

  const tvly = tavily({ apiKey });

  try {
    const response = await tvly.search(SEARCH_QUERY, {
      // Advanced depth analyzes full page text rather than just metadata
      searchDepth: 'advanced',
      maxResults: SEARCH_MAX_RESULTS,
    });

    if (!response || !response.results) {
      return [];
    }

    return response.results.map(result => ({
      title: result.title || 'Title not available',
      url: result.url || '#',
      content: result.content || '',
    }));

  } catch (error) {
    console.error('❌ Error during Tavily search:', error.message);
    return [];
  }
}