import { useMemo } from 'react';

export function BarChart({ data, height = 160 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-medium text-ink-600">{d.value}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{ height: `${(d.value / max) * (height - 36)}px`, backgroundColor: d.color || '#3377ff', minHeight: 4 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="truncate text-[10px] text-ink-500" style={{ maxWidth: 60 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg width={size} height={size} className="-rotate-90 shrink-0">
        {data.map((d) => {
          const len = (d.value / total) * circumference;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
            />
          );
          offset += len;
          return seg;
        })}
        <circle cx={size / 2} cy={size / 2} r={radius - stroke / 2} fill="white" />
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-ink-600">{d.label}</span>
            <span className="font-medium text-ink-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, color = '#3377ff', width = 240, height = 48 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ');
  const areaPath = `M0,${height} L${points.split(' ').map((p) => p).join(' L')} L${width},${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({ label, value, sub, icon, accent = '#3377ff' }: { label: string; value: string | number; sub?: string; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between">
        <p className="section-title">{label}</p>
        {icon && <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}15`, color: accent }}>{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

export function useMemoStats(records: { category: string; intelligenceScore: number; qualityScore: number; analysis: { fields: { key: string; value: string | null }[]; insights: { missingInformation: string[] } } }[]) {
  return useMemo(() => {
    const total = records.length;
    const avgIQ = total ? Math.round(records.reduce((s, r) => s + r.intelligenceScore, 0) / total) : 0;
    const avgDQ = total ? Math.round(records.reduce((s, r) => s + r.qualityScore, 0) / total) : 0;

    const attention = records.filter((r) => r.qualityScore < 70 || r.intelligenceScore < 70).length;

    // Missing attribute frequency
    const missingFreq = new Map<string, number>();
    records.forEach((r) => {
      r.analysis.insights.missingInformation.forEach((m) => {
        missingFreq.set(m, (missingFreq.get(m) || 0) + 1);
      });
    });
    const mostMissing = Array.from(missingFreq.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';

    // Category distribution
    const catMap = new Map<string, number>();
    records.forEach((r) => catMap.set(r.category, (catMap.get(r.category) || 0) + 1));
    const categories = Array.from(catMap.entries()).map(([label, value]) => ({ label, value }));

    // Quality distribution buckets
    const buckets = [
      { label: '0-49', min: 0, max: 49 },
      { label: '50-69', min: 50, max: 69 },
      { label: '70-84', min: 70, max: 84 },
      { label: '85-100', min: 85, max: 100 },
    ];
    const qualityDist = buckets.map((b) => ({
      label: b.label,
      value: records.filter((r) => r.qualityScore >= b.min && r.qualityScore <= b.max).length,
    }));

    const missingChart = Array.from(missingFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));

    return { total, avgIQ, avgDQ, attention, mostMissing, categories, qualityDist, missingChart };
  }, [records]);
}
