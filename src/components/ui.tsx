import type { ReactNode } from 'react';
import { confidenceLabel, type Confidence } from '@/types';

export function ScoreRing({ score, size = 120, stroke = 10, label }: { score: number; size?: number; stroke?: number; label?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#3377ff' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink-900">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-400">/ 100</span>
        {label && <span className="mt-0.5 text-[10px] font-medium text-ink-500">{label}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = color || (value >= 85 ? '#10b981' : value >= 70 ? '#3377ff' : value >= 50 ? '#f59e0b' : '#ef4444');
  return (
    <div className="h-2 w-full rounded-full bg-ink-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: c }}
      />
    </div>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const label: Confidence = confidenceLabel(confidence);
  const styles = label === 'High' ? 'bg-accent-100 text-accent-700' : label === 'Medium' ? 'bg-warn-100 text-warn-700' : 'bg-danger-100 text-danger-700';
  return (
    <span className={`chip ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} · {confidence}%
    </span>
  );
}

export function StatusBadge({ status }: { status: 'valid' | 'warning' | 'error' }) {
  const map = {
    valid: { cls: 'bg-accent-100 text-accent-700', text: 'Valid' },
    warning: { cls: 'bg-warn-100 text-warn-700', text: 'Warning' },
    error: { cls: 'bg-danger-100 text-danger-700', text: 'Error' },
  };
  const s = map[status];
  return <span className={`chip ${s.cls}`}>{s.text}</span>;
}

export function SectionCard({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-ink-300">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FieldRow({ label, value, normalized }: { label: string; value: string | null; normalized?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-ink-100 last:border-0">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      {value ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-900">{value}</span>
          {normalized && normalized !== value && (
            <span className="text-xs text-brand-600 font-medium">→ {normalized}</span>
          )}
        </div>
      ) : (
        <span className="text-sm text-ink-400 italic">Not available in source</span>
      )}
    </div>
  );
}
