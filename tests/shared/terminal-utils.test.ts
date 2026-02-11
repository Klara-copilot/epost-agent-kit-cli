/**
 * Unit tests for Terminal Utils
 * Priority: P2 - Infrastructure
 */

import { describe, it, expect } from 'vitest';
import { stripAnsi, termWidth, indent, box, heading, stepHeader } from '@/shared/terminal-utils.js';

describe('TerminalUtils', () => {
  describe('Strip ANSI', () => {
    it('should strip ANSI codes from strings', () => {
      const result = stripAnsi('\x1b[31mRed Text\x1b[0m');
      expect(result).toBe('Red Text');
    });

    it('should handle strings without ANSI codes', () => {
      const result = stripAnsi('Plain text');
      expect(result).toBe('Plain text');
    });

    it('should handle empty strings', () => {
      const result = stripAnsi('');
      expect(result).toBe('');
    });
  });

  describe('Term Width', () => {
    it('should return terminal width', () => {
      const width = termWidth();
      expect(typeof width).toBe('number');
      expect(width).toBeGreaterThan(0);
    });
  });

  describe('Indent', () => {
    it('should indent text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = indent(text, 2);
      expect(result).toContain('  Line 1');
      expect(result).toContain('  Line 2');
      expect(result).toContain('  Line 3');
    });

    it('should handle single line', () => {
      const text = 'Single line';
      const result = indent(text, 4);
      expect(result).toBe('    Single line');
    });

    it('should use default indent of 2', () => {
      const text = 'Default';
      const result = indent(text);
      expect(result).toBe('  Default');
    });
  });

  describe('Box', () => {
    it('should create a box around text', () => {
      const result = box('Test content');
      expect(result).toContain('Test content');
      expect(result.length).toBeGreaterThan('Test content'.length);
    });

    it('should handle multiline text', () => {
      const result = box('Line 1\nLine 2');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('Heading', () => {
    it('should format heading text', () => {
      const result = heading('My Heading');
      expect(result).toContain('My Heading');
      expect(result.length).toBeGreaterThan('My Heading'.length);
    });
  });

  describe('Step Header', () => {
    it('should format step headers', () => {
      const result = stepHeader(1, 5, 'First step');
      expect(result).toContain('First step');
      expect(result).toContain('1');
    });

    it('should handle different step numbers', () => {
      const result = stepHeader(3, 10, 'Third step');
      expect(result).toContain('Third step');
      expect(result).toContain('3');
    });
  });
});
