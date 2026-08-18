import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { ExtractedField, ProductAnalysis } from '@/types';
import { ScoreRing, ProgressBar, ConfidenceBadge, StatusBadge, SectionCard, EmptyState } from '@/components/ui';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';
import {
  Package, SlidersHorizontal, DollarSign, Users, ShieldCheck, Brain, AlertTriangle,
  Lightbulb, Target, TrendingUp, FileText, ChevronDown, Printer, ArrowLeft, Layers,
  Ban, Gauge, GitBranch, XCircle,
} from 'lucide-react';

const GROUP_META = {
  identity: { title: 'Product Identity', icon: Package },
  specifications: { title: 'Specifications', icon: SlidersHorizontal },
  commercial: { title: 'Commercial Information', icon: DollarSign },
  market: { title: 'Customer & Market', icon: Users },
} as const;

function FieldCard({ field }: { field: ExtractedField }) {
  const isRejected = field.status === 'rejected';
  const isLowConf = field.status === 'low_confidence';

  return (
    <div className={`rounded-xl border p-3.5 ${isRejected ? 'border-danger-200 bg-danger-50/40' : isLowConf ? 'border-warn-200 bg-warn-50/40' : 'border-ink-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{field.label}</p>
        {isRejected && <span className="chip bg-danger-100 text-danger-700"><Ban className="h-3 w-3" /> Rejected</span>}
        {isLowConf && <span className="chip bg-warn-100 text-warn-700"><AlertTriangle className="h-3 w-3" /> Low confidence</span>}
      </div>
      {field.value ? (
        <div className="mt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium ${isRejected ? 'text-danger-700 line-through' : isLowConf ? 'text-warn-700' : 'text-ink-900'}`}>{field.value}</span>
            {field.normalized && field.normalized !== field.value && !isRejected && (
              <span className="inline-flex items-center gap-1 text-xs text-brand-600">→ {field.normalized}</span>
            )}
          </div>
          {isRejected && field.rejectionReason && (
            <p className="mt-1 text-xs text-danger-600">{field.rejectionReason}</p>
          )}
          {isLowConf && field.rejectionReason && (
            <p className="mt-1 text-xs text-warn-600">{field.rejectionReason}</p>
          )}
          {field.evidence && !isRejected && <EvidenceDrawer evidence={field.evidence} />}
        </div>
      ) : (
        <p className="mt-1 text-sm italic text-ink-400">Not available in source</p>
      )}
    </div>
  );
}

function GroupSection({ group, fields }: { group: keyof typeof GROUP_META; fields: ExtractedField[] }) {
  const meta = GROUP_META[group];
  const Icon = meta.icon;
  return (
    <SectionCard title={meta.title} icon={<Icon className="h-4 w-4 text-brand-600" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => <FieldCard key={f.key} field={f} />)}
      </div>
    </SectionCard>
  );
}

function ValidationItem({ rule }: { rule: ProductAnalysis['validation'][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5">
      <button onClick={() => rule.detail && setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 text-sm text-ink-700">
          {rule.status === 'valid' ? '✓' : rule.status === 'warning' ? '⚠' : '✕'} {rule.message}
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge status={rule.status} />
          {rule.detail && <ChevronDown className={`h-3.5 w-3.5 text-ink-400 transition ${open ? 'rotate-180' : ''}`} />}
        </div>
      </button>
      {open && rule.detail && (
        <p className="mt-2 text-xs text-ink-500 animate-fadeIn">{rule.detail}</p>
      )}
    </div>
  );
}

function RejectedState({ analysis }: { analysis: ProductAnalysis }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="card border-danger-200 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
          <XCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-ink-900">Insufficient Product Information</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          This document does not contain enough reliable product information to generate a Product Intelligence report.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 text-left">
          <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Detected content type</p>
            <p className="mt-1 text-sm font-medium text-ink-900">{analysis.context.detectedContentType}</p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Product context score</p>
            <p className="mt-1 text-sm font-medium text-ink-900">{analysis.context.contextScore}/100</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-ink-200 bg-white p-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Suggested action</p>
          <p className="mt-1 text-sm text-ink-600">Upload a product specification, catalog, product description, or product dataset.</p>
        </div>

        <div className="mt-4 rounded-xl border border-ink-200 bg-white p-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Rejected attributes</p>
          <div className="mt-2 space-y-1.5">
            {analysis.fields.filter((f) => f.status === 'rejected' || f.status === 'low_confidence').map((f) => (
              <div key={f.key} className="flex items-start gap-2 text-xs text-ink-600">
                <Ban className="mt-0.5 h-3 w-3 shrink-0 text-danger-500" />
                <span><span className="font-medium">{f.label}:</span> "{f.value}" — {f.rejectionReason}</span>
              </div>
            ))}
            {analysis.fields.filter((f) => f.status === 'rejected' || f.status === 'low_confidence').length === 0 && (
              <p className="text-xs text-ink-400">No attributes were extracted — content lacks product structure.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportPage({ id }: { id: string }) {
  const { getRecord, navigate } = useApp();
  const record = getRecord(id);
  const [reportMode, setReportMode] = useState(false);

  if (!record) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Analysis not found"
          description="This product analysis may have been removed. Return to history to pick another."
          action={<button onClick={() => navigate({ name: 'history' })} className="btn-primary px-4 py-2 text-sm">Go to History</button>}
        />
      </div>
    );
  }

  const a = record.analysis;
  const isRejected = record.status === 'rejected' || !a.context.isProductContent;
  const groups: ExtractedField['group'][] = ['identity', 'specifications', 'commercial', 'market'];

  const handlePrint = () => {
    setReportMode(true);
    setTimeout(() => {
      window.print();
      setReportMode(false);
    }, 100);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate({ name: 'workspace' })} className="btn-ghost mt-0.5 p-1.5">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{record.productName}</h1>
            <p className="text-sm text-ink-500">
              {a.classification.category} · {a.classification.productType} · analyzed {new Date(record.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        {!isRejected && (
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary px-4 py-2 text-sm">
              <Printer className="h-4 w-4" /> Generate Report
            </button>
          </div>
        )}
      </div>

      {/* Print-only header */}
      {reportMode && (
        <div className="hidden print-block mb-6">
          <h1 className="text-2xl font-bold">Product Intelligence Report</h1>
          <p className="text-sm text-ink-600">{record.productName} — {new Date(record.createdAt).toLocaleDateString()}</p>
        </div>
      )}

      {/* Product Context Score banner */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.context.isProductContent ? 'bg-accent-100 text-accent-700' : 'bg-danger-100 text-danger-700'}`}>
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="section-title">Product Context Score</p>
              <p className="text-sm text-ink-700">{a.context.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-ink-900">{a.context.contextScore}<span className="text-sm font-normal text-ink-400">/100</span></p>
              <p className="text-xs text-ink-500">{a.context.detectedContentType}</p>
            </div>
            {a.context.isProductContent ? (
              <span className="chip bg-accent-100 text-accent-700">Product content</span>
            ) : (
              <span className="chip bg-danger-100 text-danger-700">Low product relevance</span>
            )}
          </div>
        </div>
      </div>

      {/* Rejection state */}
      {isRejected && <RejectedState analysis={a} />}

      {/* Full report — only for product content */}
      {!isRejected && (
        <>
          {/* Top scores */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card flex flex-col items-center p-5">
              <p className="section-title mb-2">Product Intelligence Score</p>
              <ScoreRing score={a.intelligence.score} label="Intelligence" />
              <div className="mt-3 w-full space-y-2">
                {Object.entries({
                  Completeness: a.intelligence.breakdown.completeness,
                  Consistency: a.intelligence.breakdown.consistency,
                  'Evidence Coverage': a.intelligence.breakdown.evidenceCoverage,
                  Classification: a.intelligence.breakdown.classification,
                  'Spec Quality': a.intelligence.breakdown.specificationQuality,
                }).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-ink-500"><span>{k}</span><span className="font-medium text-ink-700">{v}</span></div>
                    <ProgressBar value={v} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card flex flex-col items-center p-5">
              <p className="section-title mb-2">Data Quality Score</p>
              <ScoreRing score={a.quality.score} label={a.quality.label} />
              <div className="mt-3 w-full space-y-2">
                {Object.entries({
                  Completeness: a.quality.breakdown.completeness,
                  Consistency: a.quality.breakdown.consistency,
                  Validity: a.quality.breakdown.validity,
                  Standardization: a.quality.breakdown.standardization,
                  'Evidence Coverage': a.quality.breakdown.evidenceCoverage,
                }).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-ink-500"><span>{k}</span><span className="font-medium text-ink-700">{v}</span></div>
                    <ProgressBar value={v} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="section-title mb-3">Classification</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-ink-500">Category</p>
                  <p className="text-sm font-medium text-ink-900">{a.classification.category}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Subcategory</p>
                  <p className="text-sm font-medium text-ink-900">{a.classification.subcategory}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Product Type</p>
                  <p className="text-sm font-medium text-ink-900">{a.classification.productType}</p>
                </div>
                <div className="pt-1">
                  <ConfidenceBadge confidence={a.classification.confidence} />
                </div>
                {a.classification.alternatives && a.classification.alternatives.length > 0 && a.classification.confidence < 90 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Alternatives</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {a.classification.alternatives.map((alt) => (
                        <span key={alt.label} className="chip bg-ink-100 text-ink-600">{alt.label} · {alt.confidence}%</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Why this score */}
          <div className="card mt-4 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Why this quality score?
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-accent-700">Confirmed</p>
                <ul className="space-y-1">
                  {a.quality.reasons.ok.map((r) => <li key={r} className="flex items-start gap-1.5 text-xs text-ink-600"><span className="text-accent-600">✓</span> {r}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-warn-700">Warnings</p>
                <ul className="space-y-1">
                  {a.quality.reasons.warn.length ? a.quality.reasons.warn.map((r) => <li key={r} className="flex items-start gap-1.5 text-xs text-ink-600"><span className="text-warn-600">⚠</span> {r}</li>) : <li className="text-xs text-ink-400">None</li>}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-danger-700">Errors</p>
                <ul className="space-y-1">
                  {a.quality.reasons.error.length ? a.quality.reasons.error.map((r) => <li key={r} className="flex items-start gap-1.5 text-xs text-ink-600"><span className="text-danger-600">✕</span> {r}</li>) : <li className="text-xs text-ink-400">None</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Contradictions */}
          {a.contradictions.length > 0 && (
            <div className="card mt-4 border-danger-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <GitBranch className="h-4 w-4 text-danger-600" /> Data Consistency Check
              </h3>
              <div className="mt-3 space-y-3">
                {a.contradictions.map((c, i) => (
                  <div key={i} className="rounded-xl border border-danger-200 bg-danger-50/40 p-3.5">
                    <p className="text-sm font-medium text-danger-700">⚠ Conflicting {c.field}</p>
                    <p className="mt-1 text-xs text-ink-500">Possible values:</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {c.values.map((v, j) => (
                        <span key={j} className="chip bg-white border border-danger-200 text-danger-700">{v}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field groups */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {groups.map((g) => (
              <GroupSection key={g} group={g} fields={a.fields.filter((f) => f.group === g)} />
            ))}
          </div>

          {/* Normalization */}
          <div className="mt-4">
            <SectionCard title="Smart Normalization" icon={<SlidersHorizontal className="h-4 w-4 text-brand-600" />}>
              {a.normalization.length === 0 ? (
                <p className="text-sm text-ink-400">No normalization transformations were required for this product.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wider text-ink-400">
                        <th className="pb-2 pr-3 font-semibold">Field</th>
                        <th className="pb-2 pr-3 font-semibold">Original</th>
                        <th className="pb-2 pr-3 font-semibold">Normalized</th>
                        <th className="pb-2 font-semibold">Rule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.normalization.map((n, i) => (
                        <tr key={i} className="border-b border-ink-100 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-ink-700">{n.field}</td>
                          <td className="py-2.5 pr-3 text-ink-600">{n.original}</td>
                          <td className="py-2.5 pr-3 text-brand-700 font-medium">{n.normalized}</td>
                          <td className="py-2.5 text-xs text-ink-500">{n.rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Validation */}
          <div className="mt-4">
            <SectionCard title="Validation Engine" icon={<ShieldCheck className="h-4 w-4 text-brand-600" />}>
              <div className="space-y-2">
                {a.validation.map((rule) => <ValidationItem key={rule.id} rule={rule} />)}
              </div>
            </SectionCard>
          </div>

          {/* Insights */}
          <div className="mt-4">
            <SectionCard title="AI Product Insights" icon={<Brain className="h-4 w-4 text-brand-600" />}>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Target className="h-4 w-4 text-brand-600" /> Product Positioning</h4>
                  <p className="mt-2 text-sm text-ink-600">{a.insights.positioning}</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><TrendingUp className="h-4 w-4 text-accent-600" /> Key Selling Points</h4>
                  <ul className="mt-2 space-y-1.5">
                    {a.insights.sellingPoints.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-ink-600"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />{s}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Layers className="h-4 w-4 text-warn-600" /> Missing Information</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.insights.missingInformation.map((m, i) => <span key={i} className="chip bg-warn-100 text-warn-700">{m}</span>)}
                  </div>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><AlertTriangle className="h-4 w-4 text-danger-600" /> Risk Flags</h4>
                  <ul className="mt-2 space-y-1.5">
                    {a.insights.riskFlags.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-ink-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" />{r}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 lg:col-span-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Lightbulb className="h-4 w-4 text-brand-600" /> Improvement Suggestions</h4>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {a.insights.improvementSuggestions.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-ink-600"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />{s}</li>)}
                  </ul>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Raw source */}
          <div className="mt-4">
            <SectionCard title="Raw Source Text" icon={<FileText className="h-4 w-4 text-brand-600" />}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-ink-900 p-4 text-xs text-ink-200 font-mono">{a.rawText}</pre>
            </SectionCard>
          </div>

          <div className="no-print mt-6 flex justify-end">
            <button onClick={handlePrint} className="btn-secondary px-4 py-2 text-sm">
              <Printer className="h-4 w-4" /> Generate Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}
