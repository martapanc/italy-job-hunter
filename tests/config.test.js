import { describe, it, expect } from 'vitest';
import {
  SEARCH_QUERY,
  SEARCH_QUERY_JOB_BOARDS,
  JOB_BOARD_DOMAINS,
  SEARCH_MAX_RESULTS,
  SCOUT_QUERY,
  SCOUT_MAX_RESULTS,
  TRIAGE_MODEL,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  API_DELAY_MS,
  TELEGRAM_MAX_CHARS,
  MIN_MATCH_SCORE,
} from '../src/config.js';

describe('config', () => {
  it('exports SEARCH_QUERY as a non-empty string', () => {
    expect(typeof SEARCH_QUERY).toBe('string');
    expect(SEARCH_QUERY.length).toBeGreaterThan(0);
  });

  it('exports SEARCH_QUERY_JOB_BOARDS as a non-empty string', () => {
    expect(typeof SEARCH_QUERY_JOB_BOARDS).toBe('string');
    expect(SEARCH_QUERY_JOB_BOARDS.length).toBeGreaterThan(0);
  });

  it('exports JOB_BOARD_DOMAINS as a non-empty array of strings', () => {
    expect(Array.isArray(JOB_BOARD_DOMAINS)).toBe(true);
    expect(JOB_BOARD_DOMAINS.length).toBeGreaterThan(0);
    expect(typeof JOB_BOARD_DOMAINS[0]).toBe('string');
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

  it('exports OLLAMA_BASE_URL as a valid URL string', () => {
    expect(typeof OLLAMA_BASE_URL).toBe('string');
    expect(OLLAMA_BASE_URL).toMatch(/^https?:\/\//);
  });

  it('exports OLLAMA_MODEL as a non-empty string', () => {
    expect(typeof OLLAMA_MODEL).toBe('string');
    expect(OLLAMA_MODEL.length).toBeGreaterThan(0);
  });

  it('exports API_DELAY_MS as a positive number', () => {
    expect(typeof API_DELAY_MS).toBe('number');
    expect(API_DELAY_MS).toBeGreaterThan(0);
  });

  it('exports TELEGRAM_MAX_CHARS as a positive number', () => {
    expect(typeof TELEGRAM_MAX_CHARS).toBe('number');
    expect(TELEGRAM_MAX_CHARS).toBeGreaterThan(0);
  });

  it('exports MIN_MATCH_SCORE as a number between 0 and 100', () => {
    expect(typeof MIN_MATCH_SCORE).toBe('number');
    expect(MIN_MATCH_SCORE).toBeGreaterThanOrEqual(0);
    expect(MIN_MATCH_SCORE).toBeLessThanOrEqual(100);
  });
});
