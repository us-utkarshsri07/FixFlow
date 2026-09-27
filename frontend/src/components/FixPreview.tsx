import type { FixResult, TestResult } from '../types/bug';

interface Props {
  fix: FixResult;
  testResult?: TestResult;
  onTestFix: () => void;
  onCreatePR: () => void;
  isTestLoading: boolean;
  isPRLoading: boolean;
}

export default function FixPreview({
  fix,
  testResult,
  onTestFix,
  onCreatePR,
  isTestLoading,
  isPRLoading,
}: Props) {
  return (
    <div className="fix-preview">
      <div className="fix-preview-header">
        <h2 className="fix-preview-title">Generated Fix</h2>
        <span style={{ fontSize: '.8rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
          {fix.branchName}
        </span>
      </div>

      {/* Diffs */}
      {fix.diffs.map((diff, idx) => (
        <div key={idx} className="diff-block">
          {/* File bar */}
          <div className="diff-file-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            {diff.file}
          </div>

          {/* Before / After columns */}
          <div className="diff-cols">
            <div className="diff-col">
              <div className="diff-col-header before">Before</div>
              <pre className="diff-code">{diff.before}</pre>
            </div>
            <div className="diff-col">
              <div className="diff-col-header after">After</div>
              <pre className="diff-code">{diff.after}</pre>
            </div>
          </div>

          {/* Explanation */}
          <div className="diff-explanation">{diff.explanation}</div>
        </div>
      ))}

      {/* Test Results */}
      {testResult && (
        <div className="test-results">
          <p className="test-results-title">Test Results</p>

          {testResult.allPassed && (
            <div className="validated-banner">
              <span>✓</span>
              Fix validated — all test suites passed
            </div>
          )}

          <div className="test-suite-list">
            {testResult.suites.map((suite, i) => (
              <div key={i} className={`test-suite ${suite.passed ? 'passed' : 'failed'}`}>
                <span className="test-suite-icon">{suite.passed ? '✓' : '✕'}</span>
                <span className="test-suite-name">{suite.name}</span>
                {suite.details && (
                  <span className="test-suite-detail">{suite.details}</span>
                )}
              </div>
            ))}
          </div>

          {testResult.pullRequestUrl && (
            <div className="pr-url">
              Pull request created:{' '}
              <a href={testResult.pullRequestUrl} target="_blank" rel="noopener noreferrer">
                {testResult.pullRequestUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {!testResult && (
          <button
            className={`btn btn-secondary${isTestLoading ? ' btn-loading' : ''}`}
            onClick={onTestFix}
            disabled={isTestLoading}
          >
            {!isTestLoading && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,11 12,14 22,4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            )}
            {isTestLoading ? 'Testing…' : 'Test Fix'}
          </button>
        )}

        {testResult?.allPassed && (
          <button
            className={`btn btn-success${isPRLoading ? ' btn-loading' : ''}`}
            onClick={onCreatePR}
            disabled={isPRLoading || !!testResult.pullRequestUrl}
          >
            {!isPRLoading && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                <path d="M6 9v6M15.7 7.3l-7.4 9.4" />
              </svg>
            )}
            {isPRLoading ? 'Creating PR…' : testResult.pullRequestUrl ? 'PR Created ✓' : 'Create Pull Request'}
          </button>
        )}
      </div>
    </div>
  );
}
