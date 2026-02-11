/**
 * Unit tests for YAML Parser
 * Priority: P1 - Core Business Logic
 */

import { describe, it, expect } from 'vitest';
import { parseSimpleYaml } from '@/domains/packages/package-resolver.js';

describe('YAML Parser', () => {
  describe('Basic Structure', () => {
    it('should parse simple key-value pairs', () => {
      const yaml = `
name: test-package
version: 1.0.0
description: Test package
`;
      const result = parseSimpleYaml(yaml);
      expect(result.name).toBe('test-package');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('Test package');
    });

    it('should handle inline arrays', () => {
      const yaml = `
tags: [backend, api, rest]
dependencies: [core, utils]
`;
      const result = parseSimpleYaml(yaml);
      expect(result.tags).toEqual(['backend', 'api', 'rest']);
      expect(result.dependencies).toEqual(['core', 'utils']);
    });

    it('should handle block arrays', () => {
      const yaml = `
packages:
  - core
  - backend
  - frontend
`;
      const result = parseSimpleYaml(yaml);
      expect(result.packages).toEqual(['core', 'backend', 'frontend']);
    });

    it('should handle nested objects', () => {
      const yaml = `
metadata:
  author: John Doe
  created: 2024-01-01
`;
      const result = parseSimpleYaml(yaml);
      expect(result.metadata.author).toBe('John Doe');
      expect(result.metadata.created).toBe('2024-01-01');
    });
  });

  describe('Comments', () => {
    it('should ignore comments', () => {
      const yaml = `
# Package configuration
name: test-package  # Package name
version: 1.0.0     # Semantic version
`;
      const result = parseSimpleYaml(yaml);
      expect(result.name).toBe('test-package');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('Profile Parsing', () => {
    it('should parse profile definitions', () => {
      const yaml = `
full:
  display_name: Full Profile
  packages:
    - core
    - backend
    - frontend
minimal:
  display_name: Minimal Profile
  packages:
    - core
`;
      const result = parseSimpleYaml(yaml);
      expect(result.full.display_name).toBe('Full Profile');
      expect(result.full.packages).toEqual(['core', 'backend', 'frontend']);
      expect(result.minimal.display_name).toBe('Minimal Profile');
      expect(result.minimal.packages).toEqual(['core']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty lines', () => {
      const yaml = `
name: test

version: 1.0.0
`;
      const result = parseSimpleYaml(yaml);
      expect(result.name).toBe('test');
      expect(result.version).toBe('1.0.0');
    });

    it('should handle quoted strings', () => {
      const yaml = `
description: "A description with: colons"
path: "C:\\\\Windows\\\\Path"
`;
      const result = parseSimpleYaml(yaml);
      expect(result.description).toContain('colons');
    });

    it('should handle numeric values', () => {
      const yaml = `
layer: 1
version: 2.0
`;
      const result = parseSimpleYaml(yaml);
      expect(result.layer).toBe(1);
    });
  });
});
