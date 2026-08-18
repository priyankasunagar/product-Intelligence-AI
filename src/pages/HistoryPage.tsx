import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { EmptyState, ScoreRing } from '@/components/ui';
import { History, Search, Trash2, ArrowRight, Filter, Calendar, SlidersHorizontal } from 'lucide-react';

type SortKey = 'date-desc' | 'date-asc' | 'iq-desc' | 'dq-desc' | 'name';

export function HistoryPage() {
  const { records, navigate, deleteRecord, clearAll } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [minScore, setMinScore] = useState(0);

  const categories = useMemo(() => Array.from(new Set(records.map((r) => r.category))), [records]);

  const filtered = useMemo(() => {
    let list = records.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (r.intelligenceScore < minScore) return false;
      if (query && !r.productName.toLowerCase().includes(query.toLowerCase()) && !r.category.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    list = list.sort((a, b) => {
      switch (sort) {
        case 'date-asc': return a.createdAt - b.createdAt;
        case 'date-desc': return b.createdAt - a.createdAt;
        case 'iq-desc': return b.intelligenceScore - a.intelligenceScore;
        case 'dq-desc': return b.qualityScore - a.qualityScore;
        case 'name': return a.productName.localeCompare(b.productName);
      }
    });
    return list;
  }, [records, category, sort, query, minScore]);

  if (records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <EmptyState
          icon={<History className="h-10 w-10" />}
          title="No analysis history yet"
          description="Products you analyze will appear here with their scores and status."
          action={<button onClick={() => navigate({ name: 'workspace' })} className="btn-primary px-4 py-2 text-sm">Analyze a Product</button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Analysis History</h1>
          <p className="text-sm text-ink-500">{records.length} product{records.length !== 1 ? 's' : ''} analyzed. Search, filter, and reopen any report.</p>
        </div>
        <button onClick={() => { if (confirm('Clear all analysis history? This cannot be undone.')) clearAll(); }} className="btn-ghost px-3 py-2 text-sm text-danger-600 hover:bg-danger-50">
          <Trash2 className="h-4 w-4" /> Clear all
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product or category…"
              className="input pl-9"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input pl-9">
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input pl-9">
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="iq-desc">Highest intelligence</option>
              <option value="dq-desc">Highest quality</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 whitespace-nowrap">Min IQ</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="w-8 text-xs font-medium text-ink-700">{minScore}</span>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No matches"
            description="Try adjusting your search query or filters."
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="card card-hover p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <ScoreRing score={r.intelligenceScore} size={64} stroke={6} />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate({ name: 'report', id: r.id })} className="text-left">
                      <p className="text-sm font-semibold text-ink-900 hover:text-brand-600">{r.productName}</p>
                    </button>
                    <p className="text-xs text-ink-500">{r.category} · {r.productType}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${r.status === 'rejected' ? 'bg-danger-500' : 'bg-accent-500'}`} />{r.status === 'rejected' ? 'Rejected' : 'Complete'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Intelligence</p>
                    <p className="text-sm font-semibold text-ink-900">{r.intelligenceScore}/100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-500">Quality</p>
                    <p className="text-sm font-semibold text-ink-900">{r.qualityScore}/100</p>
                  </div>
                  <button onClick={() => deleteRecord(r.id)} className="btn-ghost p-2 text-ink-400 hover:text-danger-600 hover:bg-danger-50" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => navigate({ name: 'report', id: r.id })} className="btn-secondary px-3 py-2 text-sm">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
