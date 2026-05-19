import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analizzaConDeepSeek } from '../src/deepseek_analyzer.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('fs');

import fs from 'fs';

const mockAnnuncio = {
  title: 'Full Stack Developer',
  url: 'https://example.com/job/123',
  content: 'Node.js backend, Vue.js frontend, Italian market.',
};

describe('analizzaConDeepSeek', () => {
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    vi.mocked(fs.readFileSync).mockReturnValue('# My CV\n## Skills\nNode.js, Vue.js');
  });

  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
    vi.restoreAllMocks();
  });

  it('returns the report string on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Match score: 85%' } }] }),
    }));
    const result = await analizzaConDeepSeek(mockAnnuncio);
    expect(result).toBe('Match score: 85%');
  });

  it('returns an error string when DEEPSEEK_API_KEY is missing', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const result = await analizzaConDeepSeek(mockAnnuncio);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an error string when the CV file cannot be read', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    const result = await analizzaConDeepSeek(mockAnnuncio);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an error string on HTTP error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }));
    const result = await analizzaConDeepSeek(mockAnnuncio);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
