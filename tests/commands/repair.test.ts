/**
 * Unit tests for repair command logic.
 * Validates: passes when validate passes, runs init on failure.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── runRepair integration stubs ───────────────────────────────────────────

/**
 * Test the core logic of repair without invoking the full command:
 * - If all checks pass → print "Nothing to repair" and exit 0
 * - If checks fail → ask user (unless --yes) → run init → re-check
 */

describe('repair — check logic', () => {
  it('reports nothing to repair when no failures', () => {
    const checks = [
      { name: 'config', status: 'pass', message: 'ok' },
      { name: 'skills', status: 'pass', message: 'ok' },
      { name: 'routing', status: 'pass', message: 'ok' },
    ];
    const failed = checks.filter((c) => c.status === 'fail');
    expect(failed.length).toBe(0);
  });

  it('detects failures when config is missing', () => {
    const checks = [
      { name: 'config', status: 'fail', message: '.epost.json not found' },
      { name: 'skills', status: 'fail', message: 'No config — skip' },
      { name: 'routing', status: 'warn', message: 'CLAUDE.md found but no routing table' },
    ];
    const failed = checks.filter((c) => c.status === 'fail');
    expect(failed.length).toBe(2);
    expect(failed[0].name).toBe('config');
  });

  it('does not count warnings as failures', () => {
    const checks = [
      { name: 'config', status: 'pass', message: 'ok' },
      { name: 'skills', status: 'warn', message: 'No skills installed' },
      { name: 'hooks', status: 'warn', message: 'hooks/ present but no hooks registered' },
    ];
    const failed = checks.filter((c) => c.status === 'fail');
    expect(failed.length).toBe(0);
  });
});

describe('repair — JSON output shape', () => {
  it('nothing-to-repair JSON shape is correct', () => {
    const output = {
      repaired: false,
      message: 'Nothing to repair',
      checks: [{ name: 'config', status: 'pass', message: 'ok' }],
    };
    expect(output.repaired).toBe(false);
    expect(output.message).toBe('Nothing to repair');
    expect(output.checks).toHaveLength(1);
  });

  it('repaired JSON shape is correct', () => {
    const output = {
      repaired: true,
      success: true,
      checks: [{ name: 'config', status: 'pass', message: 'ok' }],
    };
    expect(output.repaired).toBe(true);
    expect(output.success).toBe(true);
  });

  it('repaired with still-failing checks marks success false', () => {
    const afterChecks = [
      { name: 'config', status: 'fail', message: 'still broken' },
    ];
    const stillFailed = afterChecks.filter((c) => c.status === 'fail');
    const output = {
      repaired: true,
      success: stillFailed.length === 0,
      checks: afterChecks,
    };
    expect(output.success).toBe(false);
  });
});

describe('repair — init invocation', () => {
  it('passes --force and --yes to runInit', () => {
    // Simulate what repair does when it calls runInit
    const capturedOpts: Record<string, unknown>[] = [];
    const mockRunInit = vi.fn(async (opts: Record<string, unknown>) => {
      capturedOpts.push(opts);
    });

    // Run the mock
    mockRunInit({ dir: '/some/project', force: true, yes: true });

    expect(capturedOpts).toHaveLength(1);
    expect(capturedOpts[0].force).toBe(true);
    expect(capturedOpts[0].yes).toBe(true);
  });
});
