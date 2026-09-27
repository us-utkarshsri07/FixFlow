import type { AgentStatus } from '../types/bug';

interface Props {
  status: AgentStatus;
}

function StepIcon({ stepStatus }: { stepStatus: 'pending' | 'running' | 'done' | 'error' }) {
  if (stepStatus === 'running') {
    return (
      <span className="step-icon running">
        <span className="step-spinner" />
      </span>
    );
  }
  if (stepStatus === 'done') {
    return <span className="step-icon done">✓</span>;
  }
  if (stepStatus === 'error') {
    return <span className="step-icon error">✕</span>;
  }
  return <span className="step-icon pending" />;
}

const PHASE_LABEL: Record<AgentStatus['phase'], string> = {
  analyzing: 'AI Agent — Analyzing repository',
  fixing:    'AI Agent — Generating fix',
  testing:   'AI Agent — Running tests',
};

export default function AgentProgress({ status }: Props) {
  return (
    <div className="agent-progress">
      <p className="agent-progress-title">{PHASE_LABEL[status.phase]}</p>
      <div className="agent-steps">
        {status.steps.map(step => (
          <div key={step.id} className={`agent-step ${step.status}`}>
            <StepIcon stepStatus={step.status} />
            <span className={`step-label ${step.status}`}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
