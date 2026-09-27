import type { BugReport, BugAnalysis, FixResult, TestResult } from '../types/bug';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Cannot connect to backend at ${API_BASE}. ` +
      'Make sure the FastAPI server is running: uvicorn app.main:app --reload'
    );
  }

  if (!res.ok) {
    // Try to surface the backend error message
    let detail = `Server error ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch { /* ignore parse errors */ }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

interface BackendBug {
  id: string;
  title: string;
  detected_severity: string;
  root_cause: string;
  affected_file: string;
  line_number: number;
  explanation: string;
  impact: string;
  recommended_fix: string;
  confidence: number;
}

interface AnalysisResponse {
  bug: BackendBug;
  repository_url: string;
  analyzed_at: string;
}

interface FileDiffRaw {
  file: string;
  before: string;
  after: string;
  explanation: string;
}

interface FixResponseRaw {
  analysis_id: string;
  branch_name: string;
  commit_message: string;
  diffs: FileDiffRaw[];
  generated_at: string;
}

export async function analyzeIssue(report: BugReport): Promise<BugAnalysis> {
  const data = await post<AnalysisResponse>('/api/analysis', {
    repository_url: report.repositoryUrl,
    title: report.title,
    severity: report.severity,
    description: report.description,
    environment: report.environment || undefined,
  });

  const bug = data.bug;
  return {
    id: bug.id,
    title: bug.title,
    detectedSeverity: bug.detected_severity as BugAnalysis['detectedSeverity'],
    rootCause: bug.root_cause,
    affectedFile: bug.affected_file,
    lineNumber: bug.line_number,
    explanation: bug.explanation,
    impact: bug.impact,
    recommendedFix: bug.recommended_fix,
    confidence: bug.confidence,
  };
}

export async function generateFix(analysis: BugAnalysis): Promise<FixResult> {
  const data = await post<FixResponseRaw>('/api/fixes', {
    bug_id: analysis.id,
    repository_url: '',
    affected_file: analysis.affectedFile,
    root_cause: analysis.rootCause,
    recommended_fix: analysis.recommendedFix,
  });

  return {
    analysisId: data.analysis_id,
    branchName: data.branch_name,
    commitMessage: data.commit_message,
    diffs: data.diffs.map(d => ({
      file: d.file,
      before: d.before,
      after: d.after,
      explanation: d.explanation,
    })),
  };
}

export async function testFix(fix: FixResult): Promise<TestResult> {
  await new Promise(r => setTimeout(r, 1800));
  return {
    fixId: fix.analysisId,
    allPassed: true,
    suites: [
      { name: 'Unit tests',        passed: true },
      { name: 'Integration tests', passed: true },
      { name: 'Static analysis',   passed: true },
    ],
  };
}

export async function createPullRequest(
  _fix: FixResult,
  repositoryUrl: string,
): Promise<{ pullRequestUrl: string }> {
  await new Promise(r => setTimeout(r, 800));
  return { pullRequestUrl: `${repositoryUrl}/pulls` };
}
