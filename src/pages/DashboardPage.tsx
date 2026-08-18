import { useApp } from '@/context/AppContext';
import { BarChart, DonutChart, StatCard, useMemoStats } from '@/components/charts';
import { EmptyState } from '@/components/ui';
import { Boxes, Brain, ShieldCheck, AlertTriangle, Layers, PieChart, Activity, ArrowRight } from 'lucide-react';

const CATEGORY_COLORS = ['#3377ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function DashboardPage() {
  const { records, navigate } = useApp();
  const stats = useMemoStats(records);

  if (records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No analyses yet"
          description="Analyze your first product to populate the dashboard with intelligence and quality stats."
          action={<button onClick={() => navigate({ name: 'workspace' })} className="btn-primary px-4 py-2 text-sm">Analyze a Product</button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">Overview of all analyzed products and their intelligence metrics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Products" value={stats.total} sub="products analyzed" icon={<Boxes className="h-4 w-4" />} accent="#3377ff" />
        <StatCard label="Avg Intelligence" value={`${stats.avgIQ}/100`} sub="across all products" icon={<Brain className="h-4 w-4" />} accent="#10b981" />
        <StatCard label="Avg Data Quality" value={`${stats.avgDQ}/100`} sub="across all products" icon={<ShieldCheck className="h-4 w-4" />} accent="#8b5cf6" />
        <StatCard label="Need Attention" value={stats.attention} sub="score below 70" icon={<AlertTriangle className="h-4 w-4" />} accent="#f59e0b" />
        <StatCard label="Top Missing Attribute" value={stats.mostMissing} sub="most frequent gap" icon={<Layers className="h-4 w-4" />} accent="#ef4444" />
        <StatCard label="Categories" value={stats.categories.length} sub="distinct product categories" icon={<PieChart className="h-4 w-4" />} accent="#06b6d4" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-900">Category Distribution</h3>
          <p className="mt-0.5 text-xs text-ink-500">How analyzed products split by category.</p>
          <div className="mt-5">
            {stats.categories.length > 0 ? (
              <DonutChart
                data={stats.categories.map((c, i) => ({ label: c.label, value: c.value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
              />
            ) : (
              <p className="text-sm text-ink-400">No data</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-900">Data Quality Distribution</h3>
          <p className="mt-0.5 text-xs text-ink-500">Products grouped by quality score band.</p>
          <div className="mt-6">
            <BarChart
              data={[
                { ...stats.qualityDist[0], color: '#ef4444' },
                { ...stats.qualityDist[1], color: '#f59e0b' },
                { ...stats.qualityDist[2], color: '#3377ff' },
                { ...stats.qualityDist[3], color: '#10b981' },
              ]}
            />
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-900">Missing Attribute Frequency</h3>
          <p className="mt-0.5 text-xs text-ink-500">Which attributes are most often absent across products.</p>
          <div className="mt-6">
            {stats.missingChart.length > 0 ? (
              <BarChart data={stats.missingChart.map((m, i) => ({ label: m.label, value: m.value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))} height={180} />
            ) : (
              <p className="text-sm text-ink-400">No missing attributes detected — every field is populated across all products.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Recent Analyses</h3>
          <button onClick={() => navigate({ name: 'history' })} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {records.slice(0, 5).map((r) => (
            <button
              key={r.id}
              onClick={() => navigate({ name: 'report', id: r.id })}
              className="flex w-full items-center justify-between rounded-xl border border-ink-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{r.productName}</p>
                <p className="text-xs text-ink-500">{r.category} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-ink-500">IQ</p>
                  <p className="text-sm font-semibold text-ink-900">{r.intelligenceScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-500">DQ</p>
                  <p className="text-sm font-semibold text-ink-900">{r.qualityScore}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
