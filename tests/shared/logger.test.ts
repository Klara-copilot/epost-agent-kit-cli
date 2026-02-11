/**
 * Unit tests for Logger
 * Priority: P2 - Infrastructure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '@/shared/logger.js';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Info Logging', () => {
    it('should log info messages', () => {
      logger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Warning Logging', () => {
    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Success Logging', () => {
    it('should log success messages', () => {
      logger.success('Success message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Step Logging', () => {
    it('should log step messages with numbers', () => {
      logger.step(1, 5, 'Step message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle different step counts', () => {
      logger.step(3, 10, 'Step 3 of 10');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Heading', () => {
    it('should log heading text', () => {
      logger.heading('Section Title');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Box', () => {
    it('should log boxed content', () => {
      logger.box('Boxed content');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Spinner', () => {
    it('should create spinner instance', () => {
      const spinner = logger.spinner('Loading...');
      expect(spinner).toBeDefined();
      expect(typeof spinner.start).toBe('function');
      expect(typeof spinner.stop).toBe('function');
    });
  });
});
