import { useCallback, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SAMPLE_PRODUCTS } from '@/lib/samples';
import { PIPELINE_STEPS, runPipelineStep } from '@/lib/engine';
import {
  Upload, FileText, FileType2, X, Play, Sparkles, CheckCircle2, Loader2, FileUp,
} from 'lucide-react';

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  text: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForType(type: string) {
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-danger-600" />;
  if (type.includes('csv')) return <FileType2 className="h-5 w-5 text-accent-600" />;
  if (type.includes('sheet') || type.includes('excel')) return <FileType2 className="h-5 w-5 text-accent-600" />;
  return <FileUp className="h-5 w-5 text-ink-500" />;
}

export function WorkspacePage() {
  const { analyze, loadSample, navigate } = useApp();
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    const allowed = ['text/plain', 'text/csv', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const extOk = /\.(txt|csv|pdf|xlsx?|md)$/i.test(f.name);
    if (!allowed.includes(f.type) && !extOk) {
      setError('Unsupported file type. Upload a PDF, CSV, Excel, or text file.');
      return;
    }
    try {
      let text = '';
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        // PDFs can't be parsed in-browser without a heavy lib; for the demo we
        // read what we can and note the limitation. Most browsers will yield
        // partial text or empty for binary PDFs.
        text = await f.text().catch(() => '');
        if (!text.trim()) {
          text = `[PDF binary content — ${f.name}]\nNote: In-browser PDF text extraction is limited. For the demo, paste the product description or use a sample.`;
        }
      } else {
        text = await f.text();
      }
      setFile({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, text });
    } catch {
      setError('Could not read the file. Try pasting the content instead.');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const runAnalysis = useCallback(async (rawText: string, source: 'upload' | 'paste', meta?: { fileName?: string; fileType?: string; fileSize?: number }) => {
    if (!rawText.trim()) {
      setError('No text to analyze. Upload a file, paste content, or load a sample.');
      return;
    }
    setError(null);
    setProcessing(true);
    setPipelineStep(0);
    // Animate through pipeline steps quickly but believably
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setPipelineStep(i);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 280 + Math.random() * 180));
    }
    const rec = analyze({ rawText, source, ...meta });
    setProcessing(false);
    setPipelineStep(-1);
    navigate({ name: 'report', id: rec.id });
  }, [analyze, navigate]);

  const handleAnalyze = () => {
    if (file) runAnalysis(file.text, 'upload', { fileName: file.name, fileType: file.type, fileSize: file.size });
    else if (pasteText.trim()) runAnalysis(pasteText, 'paste');
    else setError('Upload a file or paste product text to analyze.');
  };

  const handleLoadSample = (id: string) => {
    const rec = loadSample(id);
    navigate({ name: 'report', id: rec.id });
  };

  const processingActive = processing || pipelineStep >= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">Analyze a Product</h1>
        <p className="text-sm text-ink-500">Upload a product document or paste a description. The intelligence engine extracts, normalizes, validates, and scores it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: input */}
        <div className="space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`card p-6 transition ${dragging ? 'border-brand-400 bg-brand-50/40 ring-2 ring-brand-100' : ''}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.csv,.pdf,.xlsx,.xls,.md,text/plain,text/csv,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-ink-900">Drag & drop a product file here</p>
              <p className="mt-1 text-xs text-ink-500">Supports PDF, CSV, Excel, or text — up to a few MB</p>
              <button onClick={() => inputRef.current?.click()} className="btn-secondary mt-4 px-4 py-2 text-sm">
                Browse files
              </button>
            </div>
          </div>

          {/* File preview */}
          {file && (
            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100">
                    {iconForType(file.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{file.name}</p>
                    <p className="text-xs text-ink-500">{file.type || 'unknown'} · {formatSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="btn-ghost p-1.5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-600" />
                Ready to analyze · {file.text.length.toLocaleString()} characters extracted
              </div>
            </div>
          )}

          {/* Paste */}
          <div className="card p-5">
            <label className="label">Or paste product description</label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste a product title, specifications, price, features…"
              rows={6}
              className="input resize-y font-mono text-xs leading-relaxed"
            />
            <p className="mt-1.5 text-xs text-ink-400">{pasteText.length.toLocaleString()} characters</p>
          </div>

          {error && (
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAnalyze}
              disabled={processingActive || (!file && !pasteText.trim())}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Analyze Product
            </button>
          </div>

          {/* Samples */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-ink-900">Load a sample</h3>
            </div>
            <p className="mb-4 text-xs text-ink-500">Load a clean product, a messy variant, or a non-product document to see how the engine handles each.</p>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-700">Clean Products</p>
                <div className="grid gap-2.5">
                  {SAMPLE_PRODUCTS.filter((s) => s.kind === 'clean').map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSample(s.id)}
                      disabled={processingActive}
                      className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-900">{s.name}</p>
                        <p className="text-xs text-ink-500">{s.fileName}</p>
                      </div>
                      <span className="chip bg-accent-100 text-accent-700">Clean</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-warn-700">Messy Data</p>
                <div className="grid gap-2.5">
                  {SAMPLE_PRODUCTS.filter((s) => s.kind === 'messy').map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSample(s.id)}
                      disabled={processingActive}
                      className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-900">{s.name}</p>
                        <p className="text-xs text-ink-500">{s.fileName}</p>
                      </div>
                      <span className="chip bg-warn-100 text-warn-700">Messy</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-danger-700">Non-Product (Rejection Demo)</p>
                <div className="grid gap-2.5">
                  {SAMPLE_PRODUCTS.filter((s) => s.kind === 'non-product').map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSample(s.id)}
                      disabled={processingActive}
                      className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-900">{s.name}</p>
                        <p className="text-xs text-ink-500">{s.fileName}</p>
                      </div>
                      <span className="chip bg-danger-100 text-danger-700">Reject</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: pipeline / status */}
        <div className="space-y-5">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-ink-900">Intelligent Processing Pipeline</h3>
            <p className="mt-1 text-xs text-ink-500">Nine stages turn raw input into decision-ready intelligence.</p>
            <ol className="mt-5 space-y-2.5">
              {PIPELINE_STEPS.map((step, i) => {
                const done = pipelineStep > i || (!processing && pipelineStep === -1 && false);
                const active = pipelineStep === i;
                const pending = pipelineStep >= 0 && i > pipelineStep;
                return (
                  <li
                    key={step}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                      active
                        ? 'border-brand-300 bg-brand-50/60'
                        : done
                        ? 'border-ink-200 bg-ink-50/60'
                        : 'border-ink-200 bg-white'
                    }`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${
                      active ? 'bg-brand-600 text-white' : done ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-400'
                    }`}>
                      {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${active ? 'text-brand-700' : done ? 'text-ink-700' : 'text-ink-500'}`}>{step}</p>
                      {active && <p className="text-xs text-ink-500">{runPipelineStep(i, file?.text || pasteText || '')}</p>}
                    </div>
                    {pending && <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900">What you'll get</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-600" /> Structured product identity, specs & commercial fields</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-600" /> Normalized units, currencies & formats</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-600" /> Data quality + intelligence scores with breakdown</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-600" /> Evidence & confidence for every extracted attribute</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-600" /> AI insights, risk flags & improvement suggestions</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-600" /> A printable intelligence report</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
