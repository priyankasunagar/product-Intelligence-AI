// Core domain types for the Product Intelligence AI platform.

export type Confidence = 'High' | 'Medium' | 'Low';

export type ValidationStatus = 'valid' | 'warning' | 'error';

export type FieldStatus = 'valid' | 'rejected' | 'low_confidence';

export interface Evidence {
  sourceText: string;
  extractedValue: string;
  normalizedValue?: string;
  confidence: number; // 0-100
  confidenceLabel: Confidence;
  rule?: string;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string | null;
  normalized?: string | null;
  evidence?: Evidence;
  status: FieldStatus;
  rejectionReason?: string;
  group: 'identity' | 'specifications' | 'commercial' | 'market';
}

export interface NormalizationRecord {
  field: string;
  original: string;
  normalized: string;
  rule: string;
}

export interface ValidationRule {
  id: string;
  field: string;
  status: ValidationStatus;
  message: string;
  detail?: string;
}

export interface ContradictionRecord {
  field: string;
  values: string[];
  sourceTexts: string[];
}

export interface ProductClassification {
  category: string;
  subcategory: string;
  productType: string;
  confidence: number;
  alternatives?: { label: string; confidence: number }[];
}

export interface QualityBreakdown {
  completeness: number;
  consistency: number;
  validity: number;
  standardization: number;
  evidenceCoverage: number;
}

export interface DataQualityScore {
  score: number;
  label: string;
  breakdown: QualityBreakdown;
  reasons: { ok: string[]; warn: string[]; error: string[] };
}

export interface IntelligenceBreakdown {
  completeness: number;
  consistency: number;
  evidenceCoverage: number;
  classification: number;
  specificationQuality: number;
}

export interface IntelligenceScore {
  score: number;
  breakdown: IntelligenceBreakdown;
}

export interface ProductInsights {
  positioning: string;
  sellingPoints: string[];
  missingInformation: string[];
  riskFlags: string[];
  improvementSuggestions: string[];
}

export interface ProductContext {
  isProductContent: boolean;
  contextScore: number; // 0-100
  detectedContentType: string;
  reason: string;
}

export interface ProductAnalysis {
  id: string;
  createdAt: number;
  source: 'upload' | 'sample' | 'paste';
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  rawText: string;
  context: ProductContext;
  fields: ExtractedField[];
  normalization: NormalizationRecord[];
  validation: ValidationRule[];
  contradictions: ContradictionRecord[];
  classification: ProductClassification;
  quality: DataQualityScore;
  intelligence: IntelligenceScore;
  insights: ProductInsights;
}

export type AnalysisStatus = 'complete' | 'rejected';

export interface AnalysisRecord {
  id: string;
  productName: string;
  category: string;
  productType: string;
  createdAt: number;
  intelligenceScore: number;
  qualityScore: number;
  status: AnalysisStatus;
  analysis: ProductAnalysis;
}

export const NOT_AVAILABLE = 'Not available in source';
export const NOT_DETECTED = 'Not confidently detected';
export const REJECTED = 'Rejected — failed validation';

export function confidenceLabel(c: number): Confidence {
  if (c >= 85) return 'High';
  if (c >= 60) return 'Medium';
  return 'Low';
}

export function qualityLabel(score: number): string {
  if (score >= 85) return 'High Quality';
  if (score >= 70) return 'Good Quality';
  if (score >= 50) return 'Moderate Quality';
  if (score >= 30) return 'Low Quality';
  return 'Poor Quality';
}
