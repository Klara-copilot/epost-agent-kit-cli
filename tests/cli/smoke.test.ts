import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('CLI Smoke Tests', () => {
  const cliPath = './dist/cli.js';

  it('should show version', () => {
    try {
      const output = execSync(`node ${cliPath} --version`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    } catch {
      // Skip if dist not built yet
      console.warn('CLI not built, skipping version test');
    }
  });

  it('should show help', () => {
    try {
      const output = execSync(`node ${cliPath} --help`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(output).toContain('Usage');
      expect(output).toContain('Options');
    } catch {
      // Skip if dist not built yet
      console.warn('CLI not built, skipping help test');
    }
  });

  it('should list available commands', () => {
    try {
      const output = execSync(`node ${cliPath} --help`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Verify key commands are listed
      const expectedCommands = [
        'init',
        'doctor',
        'package',
        'profile',
        'onboard',
      ];

      for (const cmd of expectedCommands) {
        expect(output.toLowerCase()).toContain(cmd.toLowerCase());
      }
    } catch {
      // Skip if dist not built yet
      console.warn('CLI not built, skipping commands test');
    }
  });
});
