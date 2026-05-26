import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCompanyPitch } from '../src/spontaneous_analyzer.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('fs');

import fs from 'fs';

const mockCompany = {
  name: 'Acme Remote Inc.',
  url: 'https://acmeremote.io',
  content: 'A fully-remote SaaS company building developer tools. Hiring senior engineers.',
};

describe('generateCompanyPitch', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('# My CV\nSenior engineer with 8+ years.');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the pitch string on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Pitch content here' } }] }),
    }));
    const result = await generateCompanyPitch(mockCompany);
    expect(result).toBe('Pitch content here');
  });

  it('returns an error string when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await generateCompanyPitch(mockCompany);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns error string when choices is missing from response without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'model not found' }),
    }));
    const result = await generateCompanyPitch(mockCompany);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns error string on HTTP error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));
    const result = await generateCompanyPitch(mockCompany);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('proceeds gracefully when cv.md cannot be read', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Generic pitch' } }] }),
    }));
    const result = await generateCompanyPitch(mockCompany);
    expect(result).toBe('Generic pitch');
  });
});
