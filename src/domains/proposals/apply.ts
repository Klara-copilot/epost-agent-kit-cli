/**
 * Apply or reject a skill proposal.
 * approve: patches packages/ source skill file with old_string → new_string
 * reject:  marks proposal rejected with optional reason (no file changes)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Proposal } from './types.js';

// --- Frontmatter update helpers -------------------------------------------

/** Replace a frontmatter field value in a markdown file */
function updateFrontmatterField(content: string, key: string, value: string): string {
  const fieldRegex = new RegExp(`^(${key}:\\s*).*$`, 'm');
  if (fieldRegex.test(content)) {
    return content.replace(fieldRegex, `$1${value}`);
  }
  // Field not present — insert before closing ---
  return content.replace(/^---\r?\n([\s\S]*?)\r?\n---/, (_, body) => {
    return `---\n${body}\n${key}: ${value}\n---`;
  });
}

// --- Approve ---------------------------------------------------------------

export interface ApproveResult {
  ok: boolean;
  message: string;
  targetFile?: string;
}

export function approveProposal(proposal: Proposal, projectDir: string): ApproveResult {
  const { old_string, new_string, targetFile } = proposal;

  if (!old_string || !new_string) {
    return {
      ok: false,
      message: `Proposal ${proposal.id} is missing old_string or new_string frontmatter — cannot auto-apply.\nEdit the skill file manually and mark as approved.`,
    };
  }

  if (!targetFile) {
    return { ok: false, message: `Proposal ${proposal.id} has no targetFile.` };
  }

  const absTarget = resolve(projectDir, targetFile);
  if (!existsSync(absTarget)) {
    return { ok: false, message: `Target file not found: ${absTarget}` };
  }

  const current = readFileSync(absTarget, 'utf-8');

  // Normalize line endings for comparison
  const normalizedCurrent = current.replace(/\r\n/g, '\n');
  const normalizedOld = old_string.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  if (!normalizedCurrent.includes(normalizedOld)) {
    return {
      ok: false,
      message: `old_string not found in ${targetFile}.\nThe skill may have been edited since the proposal was created.\nReview and edit manually, then reject or re-create the proposal.`,
    };
  }

  const normalizedNew = new_string.replace(/\\n/g, '\n');
  const updated = normalizedCurrent.replace(normalizedOld, normalizedNew);
  writeFileSync(absTarget, updated, 'utf-8');

  // Update proposal status to approved
  let proposalContent = readFileSync(proposal.filePath, 'utf-8');
  proposalContent = updateFrontmatterField(proposalContent, 'status', 'approved');
  writeFileSync(proposal.filePath, proposalContent, 'utf-8');

  return {
    ok: true,
    message: `Applied to ${targetFile}\nRun \`epost-kit init\` to sync changes to .claude/`,
    targetFile,
  };
}

// --- Reject ----------------------------------------------------------------

export interface RejectResult {
  ok: boolean;
  message: string;
}

export function rejectProposal(
  proposal: Proposal,
  reason: string | undefined,
): RejectResult {
  let content = readFileSync(proposal.filePath, 'utf-8');
  content = updateFrontmatterField(content, 'status', 'rejected');
  if (reason) {
    content = updateFrontmatterField(content, 'rejectedReason', JSON.stringify(reason));
  }
  writeFileSync(proposal.filePath, content, 'utf-8');

  return {
    ok: true,
    message: `Marked ${proposal.id} as rejected.${reason ? ` Reason: ${reason}` : ''}`,
  };
}
