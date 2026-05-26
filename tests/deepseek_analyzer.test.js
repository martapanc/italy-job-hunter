import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeJobListing } from '../src/deepseek_analyzer.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('fs');

import fs from 'fs';

const mockListing = {
  title: 'Senior Full Stack Engineer — Fully Remote',
  url: 'https://example.com/jobs/123',
  content: 'We are looking for a senior full-stack engineer. Fully remote, Europe-friendly.',
};

describe('analyzeJobListing', () => {
  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockReturnValue('# My CV\n## Skills\nTypeScript, React, Node.js');
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the report string on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '🎯 **MATCH SCORE**: 85%' } }] }),
    }));
    const result = await analyzeJobListing(mockListing);
    expect(result).toBe('🎯 **MATCH SCORE**: 85%');
  });

  it('includes profile content when profile.md is present', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('# My CV')
      .mockReturnValueOnce('# Profile\nSenior engineer in Andorra');

    let capturedBody;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Report' } }] }),
      });
    }));

    await analyzeJobListing(mockListing);
    expect(capturedBody.messages[0].content).toContain('Senior engineer in Andorra');
  });

  it('returns an error string when cv.md cannot be read', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    const result = await analyzeJobListing(mockListing);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an error string when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await analyzeJobListing(mockListing);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an error string on HTTP error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));
    const result = await analyzeJobListing(mockListing);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
