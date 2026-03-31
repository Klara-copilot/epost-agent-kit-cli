/**
 * Types for skill evolution proposals and signals.
 * Schema mirrors docs/proposals/signals.json and proposal frontmatter.
 */

export type SignalType = 'journal-flag' | 'audit-failure' | 'workaround';
export type SignalStatus = 'new' | 'proposed' | 'dismissed';
export type Confidence = 'high' | 'medium' | 'low';
export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface Signal {
  id: string;
  type: SignalType;
  confidence: Confidence;
  source: string;
  excerpt: string;
  targetSkill: string;
  suggestedAction: string;
  detectedAt: string;
  status: SignalStatus;
}

export interface SignalSummaryBySkill {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export interface SignalsSummary {
  total: number;
  new: number;
  proposed: number;
  dismissed: number;
  bySkill: Record<string, SignalSummaryBySkill>;
  byType: Record<SignalType, number>;
}

export interface SignalsFile {
  generated: string;
  summary: SignalsSummary;
  signals: Signal[];
}

export interface ProposalFrontmatter {
  id: string;
  targetSkill: string;
  targetFile: string;
  signal: string;          // comma-separated signal ids
  confidence: Confidence;
  status: ProposalStatus;
  created: string;
  old_string?: string;
  new_string?: string;
  rejectedReason?: string;
}

export interface Proposal extends ProposalFrontmatter {
  /** Full path to the proposal markdown file */
  filePath: string;
  /** Body content (everything after frontmatter) */
  body: string;
}
