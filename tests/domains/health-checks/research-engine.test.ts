/**
 * Unit tests for checkResearchEngine health check
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTempDir, cleanupTempDir, createFileStructure } from '../../helpers/test-utils.js';

// Mock execa so we control whether `gemini` binary is found
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import { checkResearchEngine } from '@/domains/health-checks/health-checks.js';

const mockExeca = vi.mocked(execa);

describe('checkResearchEngine', () => {
  let tempDir: string;
  const origEnv = { ...process.env };

  beforeEach(async () => {
    tempDir = await createTempDir();
    // Clean env keys that may interfere
    delete process.env.GEMINI_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    mockExeca.mockReset();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key];
    }
    Object.assign(process.env, origEnv);
  });

  it('passes when no .epost-kit.json (defaults to websearch)', async () => {
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('websearch');
  });

  it('passes when engine is websearch', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'websearch' } } }),
    });
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('websearch');
  });

  it('passes when engine is gemini and binary is found', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'gemini' } } }),
    });
    mockExeca.mockResolvedValueOnce({ stdout: 'gemini 0.1.0' } as any);
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('Gemini');
  });

  it('warns when engine is gemini and binary not found and no API key', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'gemini' } } }),
    });
    mockExeca.mockRejectedValueOnce(new Error('not found'));
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Gemini');
    expect(result.message).toContain('npm i -g');
  });

  it('passes when engine is gemini, no binary, but GEMINI_API_KEY env set', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'gemini' } } }),
    });
    process.env.GEMINI_API_KEY = 'test-key';
    mockExeca.mockRejectedValueOnce(new Error('not found'));
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('pass');
  });

  it('passes when engine is perplexity and PERPLEXITY_API_KEY env set', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'perplexity' } } }),
    });
    process.env.PERPLEXITY_API_KEY = 'pplx-key';
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('pass');
    expect(result.message).toContain('Perplexity');
  });

  it('warns when engine is perplexity and PERPLEXITY_API_KEY not set', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'perplexity' } } }),
    });
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('PERPLEXITY_API_KEY');
  });

  it('passes when engine is perplexity and key is in .claude/.env file', async () => {
    await createFileStructure(tempDir, {
      '.claude/.epost-kit.json': JSON.stringify({ skills: { research: { engine: 'perplexity' } } }),
      '.claude/.env': 'PERPLEXITY_API_KEY=pplx-from-dotenv\n',
    });
    const result = await checkResearchEngine(tempDir);
    expect(result.status).toBe('pass');
  });
});
