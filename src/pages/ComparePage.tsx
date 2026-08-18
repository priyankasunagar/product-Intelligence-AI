import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { AnalysisRecord } from '@/types';
import { EmptyState, ScoreRing } from '@/components/ui';
import { GitCompareArrows, Trophy, Check, X, Minus, ArrowRight, Crown } from 'lucide-react';

type Criterion = 'bestValue' | 'bestFeatures' | 'bestDataQuality' | 'bestOverall';

const CRITERIA: { key: Criterion; label: string; desc: string }[] = [
  { key: 'bestOverall', label: 'Best Overall', desc: 'Balanced view of intelligence, quality, and specs.' },
  { key: 'bestValue', label: 'Best Value', desc: 'Lowest normalized price per feature richness.' },
  { key: 'bestFeatures', label: 'Best Features', desc: 'Most complete specification set.' },
  { key: 'bestDataQuality', label: 'Best Data Quality', desc: 'Highest data quality + consistency.' },
];

function getField(record: AnalysisRecord, key: string): string | null {
  return record.analysis.fields.find((f) => f.key === key)?.value ?? null;
}
function getNorm(record: AnalysisRecord, key: string): string | null {
  const f = record.analysis.fields.find((f) => f.key === key);
  return f?.normalized ?? f?.value ?? null;
}

function priceNumber(record: AnalysisRecord): number | null {
  const v = getField(record, 'price');
  if (!v) return null;
  const m = v.match(/[\d,]+(?:\.\d+)?/);
  return m ? parseFloat(m[0].replace(/,/g, '')) : null;
}

function featureCount(record: AnalysisRecord): number {
  const f = getField(record, 'features');
  if (!f) return 0;
  return f.split(/[;,]/).filter(Boolean).length;
}

function missingCount(record: AnalysisRecord): number {
  return record.analysis.insights.missingInformation.length;
}

export function ComparePage() {
  const { records, navigate } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [criterion, setCriterion] = useState<Criterion>('bestOverall');

  const selectedRecords = useMemo(
    () => selected.map((id) => records.find((r) => r.id === id)).filter(Boolean) as AnalysisRecord[],
    [selected, records]
  );

  const bestMatch = useMemo(() => {
    if (selectedRecords.length < 2) return null;
    const scored = selectedRecords.map((r) => {
      let score = 0;
      switch (criterion) {
        case 'bestOverall':
          score = r.intelligenceScore * 0.5 + r.qualityScore * 0.5;
          break;
        case 'bestValue': {
          const p = priceNumber(r);
          const fc = featureCount(r);
          score = fc > 0 && p ? fc / p * 1000 : fc * 10;
          break;
        }
        case 'bestFeatures':
          score = featureCount(r) * 10 + r.analysis.intelligence.breakdown.specificationQuality;
          break;
        case 'bestDataQuality':
          score = r.qualityScore;
          break;
      }
      return { id: r.id, score };
    });
    return scored.sort((a, b) => b.score - a.score)[0]?.id ?? null;
  }, [selectedRecords, criterion]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const rows: { label: string; get: (r: AnalysisRecord) => string | null; norm?: (r: AnalysisRecord) => string | null }[] = [
    { label: 'Category', get: (r) => r.category },
    { label: 'Product Type', get: (r) => r.productType },
    { label: 'Price', get: (r) => getField(r, 'price'), norm: (r) => getNorm(r, 'price') },
    { label: 'Currency', get: (r) => getField(r, 'currency') },
    { label: 'Weight', get: (r) => getField(r, 'weight'), norm: (r) => getNorm(r, 'weight') },
    { label: 'Dimensions', get: (r) => getField(r, 'dimensions'), norm: (r) => getNorm(r, 'dimensions') },
    { label: 'Material', get: (r) => getField(r, 'material') },
    { label: 'Color', get: (r) => getField(r, 'color') },
    { label: 'Capacity', get: (r) => getField(r, 'capacity') },
    { label: 'Compatibility', get: (r) => getField(r, 'compatibility') },
    { label: 'Features', get: (r) => getField(r, 'features') },
    { label: 'Availability', get: (r) => getField(r, 'availability') },
    { label: 'SKU', get: (r) => getField(r, 'sku') },
    { label: 'Target Customer', get: (r) => getField(r, 'targetCustomer') },
  ];

  if (records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <EmptyState
          icon={<GitCompareArrows className="h-10 w-10" />}
          title="No products to compare yet"
          description="Analyze at least two products, then return here to compare them side by side."
          action={<button onClick={() => navigate({ name: 'workspace' })} className="btn-primary px-4 py-2 text-sm">Analyze a Product</button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">Compare Products</h1>
        <p className="text-sm text-ink-500">Select 2–4 analyzed products to see a side-by-side comparison and a best-match recommendation.</p>
      </div>

      {/* Selector */}
      <div className="card mb-6 p-5">
        <p className="section-title mb-3">Select products ({selected.length}/4)</p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => {
            const active = selected.includes(r.id);
            const disabled = !active && selected.length >= 4;
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                disabled={disabled}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-40 ${
                  active ? 'border-brand-400 bg-brand-50/60' : 'border-ink-200 bg-white hover:border-ink-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{r.productName}</p>
                  <p className="text-xs text-ink-500">{r.category} · IQ {r.intelligenceScore}</p>
                </div>
                <div className={`flex h-5 w-5 items-center justify-center rounded-md ${active ? 'bg-brand-600 text-white' : 'border border-ink-300'}`}>
                  {active && <Check className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRecords.length < 2 ? (
        <div className="card p-10">
          <EmptyState
            icon={<GitCompareArrows className="h-8 w-8" />}
            title="Select at least two products"
            description="The comparison table and best-match recommendation appear once two or more products are selected."
          />
        </div>
      ) : (
        <>
          {/* Criterion selector */}
          <div className="card mb-6 p-5">
            <p className="section-title mb-3">Best-match criterion</p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {CRITERIA.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCriterion(c.key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    criterion === c.key ? 'border-brand-400 bg-brand-50/60' : 'border-ink-200 bg-white hover:border-ink-300'
                  }`}
                >
                  <p className="text-sm font-medium text-ink-900">{c.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Best match */}
          {bestMatch && (
            <div className="card mb-6 border-brand-200 bg-gradient-to-br from-brand-50/60 to-white p-5">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-brand-600" />
                <h3 className="text-sm font-semibold text-ink-900">Best Match: {CRITERIA.find((c) => c.key === criterion)?.label}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-700">
                <span className="font-medium">{selectedRecords.find((r) => r.id === bestMatch)?.productName}</span> ranks highest under this criterion based on the analyzed data.
              </p>
            </div>
          )}

          {/* Comparison table */}
          <div className="card overflow-x-auto p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">Attribute</th>
                  {selectedRecords.map((r) => (
                    <th key={r.id} className="pb-3 pr-4 text-left">
                      <div className="flex items-center gap-2">
                        {r.id === bestMatch && <Trophy className="h-3.5 w-3.5 text-brand-600" />}
                        <button onClick={() => navigate({ name: 'report', id: r.id })} className="text-sm font-semibold text-ink-900 hover:text-brand-600">
                          {r.productName}
                        </button>
                      </div>
                      <p className="text-xs text-ink-500">{r.category}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 pr-4 text-xs font-medium text-ink-500">{row.label}</td>
                    {selectedRecords.map((r) => {
                      const val = row.get(r);
                      const norm = row.norm?.(r);
                      return (
                        <td key={r.id} className="py-2.5 pr-4 align-top">
                          {val ? (
                            <div>
                              <span className="text-sm text-ink-800">{val}</span>
                              {norm && norm !== val && <div className="text-xs text-brand-600">→ {norm}</div>}
                            </div>
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-ink-300" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Scores */}
                <tr className="border-b border-ink-100">
                  <td className="py-2.5 pr-4 text-xs font-medium text-ink-500">Intelligence Score</td>
                  {selectedRecords.map((r) => (
                    <td key={r.id} className="py-2.5 pr-4">
                      <span className={`text-sm font-semibold ${r.id === bestMatch ? 'text-brand-700' : 'text-ink-800'}`}>{r.intelligenceScore}/100</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-ink-100">
                  <td className="py-2.5 pr-4 text-xs font-medium text-ink-500">Data Quality</td>
                  {selectedRecords.map((r) => (
                    <td key={r.id} className="py-2.5 pr-4">
                      <span className={`text-sm font-semibold ${r.id === bestMatch ? 'text-brand-700' : 'text-ink-800'}`}>{r.qualityScore}/100</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-ink-100">
                  <td className="py-2.5 pr-4 text-xs font-medium text-ink-500">Classification Confidence</td>
                  {selectedRecords.map((r) => (
                    <td key={r.id} className="py-2.5 pr-4">
                      <span className="text-sm text-ink-800">{r.analysis.classification.confidence}%</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-ink-100">
                  <td className="py-2.5 pr-4 text-xs font-medium text-ink-500">Missing Attributes</td>
                  {selectedRecords.map((r) => (
                    <td key={r.id} className="py-2.5 pr-4">
                      <span className="text-sm text-ink-800">{missingCount(r)}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-xs font-medium text-ink-500">Verdict</td>
                  {selectedRecords.map((r) => (
                    <td key={r.id} className="py-2.5 pr-4">
                      {r.id === bestMatch ? (
                        <span className="chip bg-brand-100 text-brand-700"><Trophy className="h-3 w-3" /> Best match</span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
