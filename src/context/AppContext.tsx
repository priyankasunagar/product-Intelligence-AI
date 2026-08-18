import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AnalysisRecord, ProductAnalysis } from '@/types';
import { analyzeText } from '@/lib/engine';
import { getSampleById } from '@/lib/samples';

const STORAGE_KEY = 'pia:analyses:v1';

type Route =
  | { name: 'landing' }
  | { name: 'workspace' }
  | { name: 'report'; id: string }
  | { name: 'compare' }
  | { name: 'dashboard' }
  | { name: 'history' };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (!h) return { name: 'landing' };
  const parts = h.split('/');
  if (parts[0] === 'workspace') return { name: 'workspace' };
  if (parts[0] === 'report' && parts[1]) return { name: 'report', id: parts[1] };
  if (parts[0] === 'compare') return { name: 'compare' };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'history') return { name: 'history' };
  return { name: 'landing' };
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'landing': return '#/';
    case 'workspace': return '#/workspace';
    case 'report': return `#/report/${route.id}`;
    case 'compare': return '#/compare';
    case 'dashboard': return '#/dashboard';
    case 'history': return '#/history';
  }
}

interface AppContextValue {
  route: Route;
  navigate: (route: Route) => void;
  records: AnalysisRecord[];
  analyze: (input: { rawText: string; source: 'upload' | 'sample' | 'paste'; fileName?: string; fileType?: string; fileSize?: number }) => AnalysisRecord;
  loadSample: (sampleId: string) => AnalysisRecord;
  getRecord: (id: string) => AnalysisRecord | undefined;
  deleteRecord: (id: string) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadRecords(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveRecords(records: AnalysisRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore quota errors
  }
}

function makeRecord(analysis: ProductAnalysis): AnalysisRecord {
  const nameField = analysis.fields.find((f) => f.key === 'name' && f.status === 'valid');
  const isRejected = !analysis.context.isProductContent;
  return {
    id: analysis.id,
    productName: nameField?.value || (isRejected ? 'Non-Product Document' : 'Untitled Product'),
    category: analysis.classification.category,
    productType: analysis.classification.productType,
    createdAt: analysis.createdAt,
    intelligenceScore: analysis.intelligence.score,
    qualityScore: analysis.quality.score,
    status: isRejected ? 'rejected' : 'complete',
    analysis,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [records, setRecords] = useState<AnalysisRecord[]>(() => loadRecords());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
  }, []);

  const analyze = useCallback<AppContextValue['analyze']>((input) => {
    const result = analyzeText(input.rawText);
    const analysis: ProductAnalysis = {
      ...result,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      source: input.source,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
    };
    const record = makeRecord(analysis);
    setRecords((prev) => [record, ...prev]);
    return record;
  }, []);

  const loadSample = useCallback((sampleId: string) => {
    const sample = getSampleById(sampleId);
    if (!sample) throw new Error('Sample not found');
    return analyze({
      rawText: sample.rawText,
      source: 'sample',
      fileName: sample.fileName,
      fileType: sample.fileType,
    });
  }, [analyze]);

  const getRecord = useCallback((id: string) => records.find((r) => r.id === id), [records]);

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ route, navigate, records, analyze, loadSample, getRecord, deleteRecord, clearAll }),
    [route, navigate, records, analyze, loadSample, getRecord, deleteRecord, clearAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
