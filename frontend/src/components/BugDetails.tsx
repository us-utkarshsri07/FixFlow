import SeverityBadge from './SeverityBadge';
import type { BugAnalysis } from '../types/bug';

interface Props {
  analysis: BugAnalysis;
  onGenerateFix: () => void;
  isLoading: boolean;
}

export default function BugDetails({ analysis, onGenerateFix, isLoading }: Props) {
  return (
    <div className="bug-details">
      <div className="bug-details-header">
        <h2 className="bug-details-title">{analysis.title}</h2>
        <SeverityBadge severity={analysis.detectedSeverity} />
      </div>

      <div className="detail-grid">
        {/* Root Cause */}
        <div className="detail-card full">
          <div className="detail-card-label">Root Cause</div>
          <div className="detail-card-value">{analysis.rootCause}</div>
        </div>

        {/* Affected File */}
        <div className="detail-card">
          <div className="detail-card-label">Affected File</div>
          <div className="detail-card-value">
            <code>{analysis.affectedFile}</code>
          </div>
        </div>

        {/* Line Number */}
        <div className="detail-card">
          <div className="detail-card-label">Line Number</div>
          <div className="detail-card-value">
            <code>L{analysis.lineNumber}</code>
          </div>
        </div>

        {/* Explanation */}
        <div className="detail-card full">
          <div className="detail-card-label">Explanation</div>
          <div className="detail-card-value">{analysis.explanation}</div>
        </div>

        {/* Impact */}
        <div className="detail-card full">
          <div className="detail-card-label">Impact</div>
          <div className="detail-card-value">{analysis.impact}</div>
        </div>

        {/* Recommended Fix */}
        <div className="detail-card full">
          <div className="detail-card-label">Recommended Fix</div>
          <div className="detail-card-value">{analysis.recommendedFix}</div>
        </div>

        {/* Confidence */}
        <div className="detail-card full">
          <div className="detail-card-label">Confidence</div>
          <div className="detail-card-value">
            <div className="confidence-bar-wrap">
              <div className="confidence-bar">
                <div className="confidence-bar-fill" style={{ width: `${analysis.confidence}%` }} />
              </div>
              <span className="confidence-pct">{analysis.confidence}%</span>
            </div>
          </div>
        </div>
      </div>

      <button
        className={`btn btn-primary${isLoading ? ' btn-loading' : ''}`}
        onClick={onGenerateFix}
        disabled={isLoading}
      >
        {!isLoading && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )}
        {isLoading ? 'Generating Fix…' : 'Generate Fix'}
      </button>
    </div>
  );
}
