import { useState } from 'react';
import type { Evidence } from '@/types';
import { ChevronDown, Quote, ArrowRight } from 'lucide-react';
import { ConfidenceBadge } from './ui';

export function EvidenceDrawer({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        View Evidence
      </button>
      {open && (
        <div className="mt-2.5 rounded-xl border border-ink-200 bg-ink-50/60 p-3.5 animate-fadeIn">
          <div className="space-y-2.5">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Source Text</p>
              <div className="flex items-start gap-2">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                <p className="text-xs italic text-ink-600">"{evidence.sourceText}"</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Extracted</p>
                <p className="text-xs text-ink-700">{evidence.extractedValue}</p>
              </div>
              {evidence.normalizedValue && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Normalized</p>
                  <p className="flex items-center gap-1 text-xs text-ink-700">
                    <ArrowRight className="h-3 w-3 text-brand-500" />
                    {evidence.normalizedValue}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Confidence</p>
                <ConfidenceBadge confidence={evidence.confidence} />
              </div>
            </div>
            {evidence.rule && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Rule Applied</p>
                <p className="text-xs text-ink-600">{evidence.rule}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
