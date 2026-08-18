import { useApp } from '@/context/AppContext';
import { SAMPLE_PRODUCTS } from '@/lib/samples';
import {
  Sparkles, FileSearch, SlidersHorizontal, GitCompareArrows, ShieldCheck,
  ArrowRight, Layers, CheckCircle2, Database, Brain, Target, LineChart,
} from 'lucide-react';

const CAPABILITIES = [
  { icon: FileSearch, title: 'AI Product Extraction', desc: 'Pull structured attributes from messy PDFs, spreadsheets, and free-text descriptions.' },
  { icon: SlidersHorizontal, title: 'Smart Normalization', desc: 'Standardize units, currencies, and formats so products become comparable.' },
  { icon: GitCompareArrows, title: 'Product Comparison', desc: 'Side-by-side analysis with best-match recommendations across criteria.' },
  { icon: ShieldCheck, title: 'Evidence-Based Insights', desc: 'Every extracted value is backed by source text and a confidence score.' },
];

const PIPELINE = [
  { icon: Database, label: 'Raw Data' },
  { icon: Layers, label: 'Structured Information' },
  { icon: ShieldCheck, label: 'Validated Data' },
  { icon: FileSearch, label: 'Evidence' },
  { icon: Brain, label: 'Product Intelligence' },
  { icon: Target, label: 'Business Decision' },
];

export function LandingPage() {
  const { navigate, loadSample } = useApp();

  const handleDemo = () => {
    const rec = loadSample(SAMPLE_PRODUCTS[0].id);
    navigate({ name: 'report', id: rec.id });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-200/70">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              Explainable product intelligence platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-6xl">
              Product Intelligence <span className="text-brand-600">AI</span>
            </h1>
            <p className="mt-5 text-lg text-ink-600 sm:text-xl">
              Turn messy product data into structured, validated, decision-ready intelligence.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate({ name: 'workspace' })}
                className="btn-primary px-6 py-3 text-base"
              >
                Analyze a Product
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleDemo}
                className="btn-secondary px-6 py-3 text-base"
              >
                Explore Demo
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-400">
              No API key required — the demo intelligence engine runs entirely in your browser.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-ink-900 sm:text-3xl">Built for messy real-world product data</h2>
          <p className="mt-2 text-ink-500">Four capabilities that take raw input to decision-ready intelligence.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="card card-hover p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-ink-900">{c.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why this matters / pipeline */}
      <section className="border-y border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-ink-900 sm:text-3xl">From Raw Data to Decision-Ready Intelligence</h2>
            <p className="mt-2 text-ink-500">
              Don't just extract product information. Understand whether the information can be trusted.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-3 md:flex-1 md:flex-col">
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-card border border-ink-200 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="mt-2 text-xs font-medium text-ink-700">{step.label}</span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 md:rotate-90 md:mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Questions answered */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-ink-900">The core questions we answer</h2>
            <p className="mt-2 text-ink-500">
              Every analysis answers seven questions that turn a product listing into a business decision.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'What is this product?',
                'What information exists?',
                'What information is missing?',
                'Is the information consistent?',
                'How confident are we?',
                'Where did the information come from?',
                'What can a business learn from it?',
              ].map((q) => (
                <li key={q} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-ink-900">A trust-first intelligence score</h3>
            <p className="mt-1.5 text-sm text-ink-500">
              The Product Intelligence Score combines completeness, consistency, evidence coverage, classification confidence, and specification quality — so you know how much to trust the data, not just what it says.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { icon: Layers, label: 'Completeness' },
                { icon: ShieldCheck, label: 'Consistency' },
                { icon: FileSearch, label: 'Evidence' },
                { icon: Brain, label: 'Classification' },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
                    <Icon className="h-4 w-4 text-brand-600" />
                    <span className="text-xs font-medium text-ink-700">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-200/70 bg-ink-900">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <LineChart className="mx-auto h-8 w-8 text-brand-400" />
          <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">See it work on a real sample</h2>
          <p className="mt-2 text-ink-300">Load a messy product document and watch the full pipeline run — no signup, no API key.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => navigate({ name: 'workspace' })} className="btn-primary px-6 py-3 text-base">
              Analyze a Product
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={handleDemo} className="btn bg-white/10 text-white hover:bg-white/20 px-6 py-3 text-base">
              Explore Demo
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-800 bg-ink-900 py-6 text-center text-xs text-ink-400">
        Product Intelligence AI — demo platform. Sample data is fictional.
      </footer>
    </div>
  );
}
