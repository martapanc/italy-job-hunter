import { describe, it, expect } from 'vitest';
import {
  SEARCH_QUERY,
  SEARCH_MAX_RESULTS,
  SCOUT_QUERY,
  SCOUT_MAX_RESULTS,
  TRIAGE_MODEL,
  ANALYSIS_MODEL,
  API_DELAY_MS,
  TELEGRAM_MAX_CHARS,
} from '../src/config.js';

describe('config', () => {
  it('exports SEARCH_QUERY as a non-empty string', () => {
    expect(typeof SEARCH_QUERY).toBe('string');
    expect(SEARCH_QUERY.length).toBeGreaterThan(0);
  });

  it('exports SEARCH_MAX_RESULTS as a positive number', () => {
    expect(typeof SEARCH_MAX_RESULTS).toBe('number');
    expect(SEARCH_MAX_RESULTS).toBeGreaterThan(0);
  });

  it('exports SCOUT_QUERY as a non-empty string', () => {
    expect(typeof SCOUT_QUERY).toBe('string');
    expect(SCOUT_QUERY.length).toBeGreaterThan(0);
  });

  it('exports SCOUT_MAX_RESULTS as a positive number', () => {
    expect(typeof SCOUT_MAX_RESULTS).toBe('number');
    expect(SCOUT_MAX_RESULTS).toBeGreaterThan(0);
  });

  it('exports TRIAGE_MODEL as a non-empty string', () => {
    expect(typeof TRIAGE_MODEL).toBe('string');
    expect(TRIAGE_MODEL.length).toBeGreaterThan(0);
  });

  it('exports ANALYSIS_MODEL as a non-empty string', () => {
    expect(typeof ANALYSIS_MODEL).toBe('string');
    expect(ANALYSIS_MODEL.length).toBeGreaterThan(0);
  });

  it('exports API_DELAY_MS as a positive number', () => {
    expect(typeof API_DELAY_MS).toBe('number');
    expect(API_DELAY_MS).toBeGreaterThan(0);
  });

  it('exports TELEGRAM_MAX_CHARS as a positive number', () => {
    expect(typeof TELEGRAM_MAX_CHARS).toBe('number');
    expect(TELEGRAM_MAX_CHARS).toBeGreaterThan(0);
  });
});
