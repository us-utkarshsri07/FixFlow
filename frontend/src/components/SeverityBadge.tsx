import type { Severity } from '../types/bug';

interface Props {
  severity: Exclude<Severity, 'auto'>;
  className?: string;
}

const LABEL: Record<Exclude<Severity, 'auto'>, string> = {
  critical: '🔴 Critical',
  high:     '🟠 High',
  medium:   '🟡 Medium',
  low:      '🟢 Low',
};

export default function SeverityBadge({ severity, className = '' }: Props) {
  return (
    <span className={`badge badge-${severity} ${className}`}>
      {LABEL[severity]}
    </span>
  );
}
