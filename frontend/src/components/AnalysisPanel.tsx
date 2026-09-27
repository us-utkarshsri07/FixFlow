import AgentProgress from './AgentProgress';
import BugDetails from './BugDetails';
import FixPreview from './FixPreview';
import type { AgentStatus, AppState, BugAnalysis, FixResult, TestResult } from '../types/bug';

interface Props {
  appState: AppState;
  agentStatus: AgentStatus | null;
  analysis: BugAnalysis | null;
  fix: FixResult | null;
  testResult: TestResult | null;
  error: string | null;
  onGenerateFix: () => void;
  onTestFix: () => void;
  onCreatePR: () => void;
  isFixLoading: boolean;
  isTestLoading: boolean;
  isPRLoading: boolean;
}

export default function AnalysisPanel({
  appState,
  agentStatus,
  analysis,
  fix,
  testResult,
  error,
  onGenerateFix,
  onTestFix,
  onCreatePR,
  isFixLoading,
  isTestLoading,
  isPRLoading,
}: Props) {
  // ── Error ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div className="error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // ── Idle — empty state ────────────────────────────────────────
  if (appState === 'idle') {
    return (
      <div className="empty-state">
        <p>Solution will be shown here.</p>
      </div>
    );
  }

  // ── Analyzing ─────────────────────────────────────────────────
  if (appState === 'analyzing' && agentStatus) {
    return <AgentProgress status={agentStatus} />;
  }

  // ── Analyzed — show bug details ───────────────────────────────
  if ((appState === 'analyzed' || appState === 'fixing') && analysis) {
    return (
      <BugDetails
        analysis={analysis}
        onGenerateFix={onGenerateFix}
        isLoading={isFixLoading}
      />
    );
  }

  // ── Fixing — show progress then diff ─────────────────────────
  if (appState === 'fixing' && agentStatus) {
    return <AgentProgress status={agentStatus} />;
  }

  // ── Testing / Fixed — show diff + test results ────────────────
  if ((appState === 'testing' || appState === 'fixed') && fix) {
    return (
      <FixPreview
        fix={fix}
        testResult={testResult ?? undefined}
        onTestFix={onTestFix}
        onCreatePR={onCreatePR}
        isTestLoading={isTestLoading}
        isPRLoading={isPRLoading}
      />
    );
  }

  // ── Fallback ──────────────────────────────────────────────────
  if (agentStatus) {
    return <AgentProgress status={agentStatus} />;
  }

  return null;
}
