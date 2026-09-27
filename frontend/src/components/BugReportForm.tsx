import { useState } from 'react';
import type { BugReport, Severity } from '../types/bug';

interface Props {
  onAnalyze: (report: BugReport) => void;
  isLoading: boolean;
}

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'auto',     label: 'Auto Detect' },
  { value: 'critical', label: 'Critical – app unusable' },
  { value: 'high',     label: 'High – major feature broken' },
  { value: 'medium',   label: 'Medium – degraded experience' },
  { value: 'low',      label: 'Low – cosmetic / minor' },
];

export default function BugReportForm({ onAnalyze, isLoading }: Props) {
  const [form, setForm] = useState<BugReport>({
    repositoryUrl: '',
    title: '',
    severity: 'auto',
    description: '',
    environment: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BugReport, string>>>({});

  function set<K extends keyof BugReport>(key: K, value: BugReport[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.repositoryUrl.trim()) next.repositoryUrl = 'Required';
    else if (!/^https?:\/\/.+/.test(form.repositoryUrl.trim())) next.repositoryUrl = 'Must be a valid URL';
    if (!form.title.trim()) next.title = 'Required';
    if (!form.description.trim()) next.description = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onAnalyze(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Repository URL */}
      <div className="field-group">
        <label className="field-label" htmlFor="repoUrl">
          Repository URL <span className="required">*</span>
        </label>
        <input
          className="field-input"
          id="repoUrl"
          type="url"
          placeholder="https://github.com/user/repository"
          value={form.repositoryUrl}
          onChange={e => set('repositoryUrl', e.target.value)}
          disabled={isLoading}
        />
        {errors.repositoryUrl && <span style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: '.2rem', display: 'block' }}>{errors.repositoryUrl}</span>}
      </div>

      {/* Title */}
      <div className="field-group">
        <label className="field-label" htmlFor="bugTitle">
          Bug Title <span className="required">*</span>
        </label>
        <input
          className="field-input"
          id="bugTitle"
          type="text"
          placeholder="e.g. Login fails on Safari 17"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          disabled={isLoading}
        />
        {errors.title && <span style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: '.2rem', display: 'block' }}>{errors.title}</span>}
      </div>

      {/* Severity */}
      <div className="field-group">
        <label className="field-label" htmlFor="bugSeverity">Severity</label>
        <select
          className="field-input"
          id="bugSeverity"
          value={form.severity}
          onChange={e => set('severity', e.target.value as Severity)}
          disabled={isLoading}
        >
          {SEVERITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="field-group">
        <label className="field-label" htmlFor="bugDescription">
          Description <span className="required">*</span>
        </label>
        <textarea
          className="field-input field-textarea"
          id="bugDescription"
          rows={5}
          placeholder={'Steps to reproduce…\n\nObserved behavior:\n\nExpected behavior:'}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          disabled={isLoading}
        />
        {errors.description && <span style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: '.2rem', display: 'block' }}>{errors.description}</span>}
      </div>

      {/* Environment */}
      <div className="field-group">
        <label className="field-label" htmlFor="bugEnvironment">Environment</label>
        <input
          className="field-input"
          id="bugEnvironment"
          type="text"
          placeholder="e.g. Node 20, Chrome 124, macOS 14"
          value={form.environment}
          onChange={e => set('environment', e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Submit */}
      <button
        className={`btn btn-primary btn-full${isLoading ? ' btn-loading' : ''}`}
        type="submit"
        disabled={isLoading}
      >
        {!isLoading && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        )}
        {isLoading ? 'Analyzing…' : 'Analyze Issue'}
      </button>
    </form>
  );
}
