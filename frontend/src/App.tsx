import { useState, useCallback } from 'react';
import Header from './components/Header';
import BugReportForm from './components/BugReportForm';
import AnalysisPanel from './components/AnalysisPanel';
import { analyzeIssue, generateFix, testFix, createPullRequest } from './services/api';
import type {
  AppState,
  AgentStatus,
  AgentStep,
  BugReport,
  BugAnalysis,
  FixResult,
  TestResult,
} from './types/bug';

const ANALYZE_STEPS: Omit<AgentStep, 'status'>[] = [
  { id: 'clone',    label: 'Analyzing repository' },
  { id: 'read',     label: 'Reading relevant files' },
  { id: 'detect',   label: 'Detecting bug' },
  { id: 'severity', label: 'Determining severity' },
  { id: 'cause',    label: 'Finding root cause' },
];

const FIX_STEPS: Omit<AgentStep, 'status'>[] = [
  { id: 'plan',   label: 'Planning code changes' },
  { id: 'patch',  label: 'Writing patch' },
  { id: 'review', label: 'Reviewing changes' },
];

const TEST_STEPS: Omit<AgentStep, 'status'>[] = [
  { id: 'unit',    label: 'Running unit tests' },
  { id: 'integ',   label: 'Running integration tests' },
  { id: 'static',  label: 'Running static analysis' },
];

function buildSteps(defs: Omit<AgentStep, 'status'>[]): AgentStep[] {
  return defs.map(d => ({ ...d, status: 'pending' }));
}

async function runSteps(
  steps: AgentStep[],
  onUpdate: (updated: AgentStep[]) => void,
  intervalMs = 650,
): Promise<void> {
  const current = steps.map(s => ({ ...s }));
  for (let i = 0; i < current.length; i++) {
    current[i].status = 'running';
    onUpdate([...current]);
    await new Promise(r => setTimeout(r, intervalMs));
    current[i].status = 'done';
    onUpdate([...current]);
  }
}

export default function App() {
  const [appState, setAppState]       = useState<AppState>('idle');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [analysis, setAnalysis]       = useState<BugAnalysis | null>(null);
  const [fix, setFix]                 = useState<FixResult | null>(null);
  const [testResult, setTestResult]   = useState<TestResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [repoUrl, setRepoUrl]         = useState('');

  const [isFixLoading,  setIsFixLoading]  = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isPRLoading,   setIsPRLoading]   = useState(false);

  const handleAnalyze = useCallback(async (report: BugReport) => {
    setError(null);
    setFix(null);
    setTestResult(null);
    setAnalysis(null);
    setRepoUrl(report.repositoryUrl);
    setAppState('analyzing');

    const steps = buildSteps(ANALYZE_STEPS);
    setAgentStatus({ phase: 'analyzing', steps, currentStepId: steps[0].id });

    try {
      const [result] = await Promise.all([
        analyzeIssue(report),
        runSteps(steps, updated =>
          setAgentStatus({ phase: 'analyzing', steps: updated, currentStepId: updated.find(s => s.status === 'running')?.id ?? null }),
        ),
      ]);
      setAnalysis(result);
      setAppState('analyzed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setAppState('error');
    }
  }, []);

  const handleGenerateFix = useCallback(async () => {
    if (!analysis) return;
    setIsFixLoading(true);
    setError(null);

    const steps = buildSteps(FIX_STEPS);
    setAgentStatus({ phase: 'fixing', steps, currentStepId: steps[0].id });
    setAppState('fixing');

    try {
      const [result] = await Promise.all([
        generateFix(analysis),
        runSteps(steps, updated =>
          setAgentStatus({ phase: 'fixing', steps: updated, currentStepId: updated.find(s => s.status === 'running')?.id ?? null }),
        ),
      ]);
      setFix(result);
      setAppState('testing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fix generation failed.');
      setAppState('error');
    } finally {
      setIsFixLoading(false);
    }
  }, [analysis]);

  const handleTestFix = useCallback(async () => {
    if (!fix) return;
    setIsTestLoading(true);
    setError(null);

    const steps = buildSteps(TEST_STEPS);
    setAgentStatus({ phase: 'testing', steps, currentStepId: steps[0].id });

    try {
      const [result] = await Promise.all([
        testFix(fix),
        runSteps(steps, updated =>
          setAgentStatus({ phase: 'testing', steps: updated, currentStepId: updated.find(s => s.status === 'running')?.id ?? null }),
        ),
      ]);
      setTestResult(result);
      setAppState('fixed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tests failed.');
      setAppState('error');
    } finally {
      setIsTestLoading(false);
    }
  }, [fix]);

  const handleCreatePR = useCallback(async () => {
    if (!fix) return;
    setIsPRLoading(true);
    setError(null);

    try {
      const result = await createPullRequest(fix, repoUrl);
      setTestResult(prev => prev ? { ...prev, pullRequestUrl: result.pullRequestUrl } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pull request.');
    } finally {
      setIsPRLoading(false);
    }
  }, [fix, repoUrl]);

  const isAnalyzing = appState === 'analyzing';

  return (
    <>
      <Header />

      <div className="app-layout">
        <aside className="sidebar">
          <h2 className="sidebar-title">Bug Report</h2>
          <BugReportForm onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
        </aside>

        <main className="main-area">
          <AnalysisPanel
            appState={appState}
            agentStatus={agentStatus}
            analysis={analysis}
            fix={fix}
            testResult={testResult}
            error={error}
            onGenerateFix={handleGenerateFix}
            onTestFix={handleTestFix}
            onCreatePR={handleCreatePR}
            isFixLoading={isFixLoading}
            isTestLoading={isTestLoading}
            isPRLoading={isPRLoading}
          />
        </main>
      </div>
    </>
  );
}
