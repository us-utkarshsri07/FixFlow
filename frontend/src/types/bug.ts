// ── Severity ──────────────────────────────────────────────────────
export type Severity = 'auto' | 'critical' | 'high' | 'medium' | 'low';

// ── Input form ────────────────────────────────────────────────────
export interface BugReport {
  repositoryUrl: string;
  title: string;
  severity: Severity;
  description: string;
  environment: string;
}

// ── Analysis result ───────────────────────────────────────────────
export interface BugAnalysis {
  id: string;
  title: string;
  detectedSeverity: Exclude<Severity, 'auto'>;
  rootCause: string;
  affectedFile: string;
  lineNumber: number;
  explanation: string;
  impact: string;
  recommendedFix: string;
  confidence: number; // 0–100
}

// ── Generated fix ─────────────────────────────────────────────────
export interface FileDiff {
  file: string;
  before: string;
  after: string;
  explanation: string;
}

export interface FixResult {
  analysisId: string;
  diffs: FileDiff[];
  branchName: string;
  commitMessage: string;
}

// ── Test result ───────────────────────────────────────────────────
export interface TestSuite {
  name: string;
  passed: boolean;
  details?: string;
}

export interface TestResult {
  fixId: string;
  suites: TestSuite[];
  allPassed: boolean;
  pullRequestUrl?: string;
}

// ── Agent progress ────────────────────────────────────────────────
export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentStep {
  id: string;
  label: string;
  status: AgentStepStatus;
}

export interface AgentStatus {
  phase: 'analyzing' | 'fixing' | 'testing';
  steps: AgentStep[];
  currentStepId: string | null;
}

// ── App workflow state ────────────────────────────────────────────
export type AppState =
  | 'idle'
  | 'analyzing'
  | 'analyzed'
  | 'fixing'
  | 'testing'
  | 'fixed'
  | 'error';
