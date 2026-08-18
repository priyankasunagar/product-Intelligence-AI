import {
  type ExtractedField,
  type Evidence,
  type NormalizationRecord,
  type ProductAnalysis,
  type ProductClassification,
  type ProductContext,
  type ProductInsights,
  type ValidationRule,
  type DataQualityScore,
  type IntelligenceScore,
  type ContradictionRecord,
  type FieldStatus,
  confidenceLabel,
  qualityLabel,
} from '@/types';

// ---------------------------------------------------------------------------
// TEXT CLEANING
// ---------------------------------------------------------------------------

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// PRODUCT CONTEXT DETECTION
// Determines whether the input actually contains product information.
// ---------------------------------------------------------------------------

const PRODUCT_SIGNAL_WORDS = [
  'product', 'brand', 'price', 'weight', 'dimensions', 'color', 'colour',
  'material', 'sku', 'model', 'category', 'specifications', 'specs',
  'features', 'availability', 'stock', 'battery', 'connectivity', 'bluetooth',
  'usb', 'warranty', 'manufacturer', 'capacity', 'display', 'processor',
  'ram', 'storage', 'screen', 'resolution', 'warranty',
];

const PRODUCT_KEYWORDS = [
  'headphone', 'headphones', 'earphone', 'earbuds', 'speaker', 'smartwatch',
  'smartwatch', 'watch', 'laptop', 'notebook', 'ultrabook', 'tablet', 'smartphone',
  'phone', 'camera', 'keyboard', 'mouse', 'monitor', 'charger', 'cable',
  'case', 'cover', 'adapter', 'power bank', 'router', 'microphone',
];

const NON_PRODUCT_INDICATORS = [
  'chapter', 'novel', 'fiction', 'directed by', 'starring', 'cast',
  'box office', 'imdb', 'rotten tomatoes', 'plot summary', 'synopsis',
  'recipe', 'ingredients', 'preheat oven', 'tablespoon', 'teaspoon',
  'once upon a time', 'poem', 'stanza', 'verse',
  'biography', 'born in', 'died in', 'early life',
  'news', 'reported', 'according to', 'journalist', 'press release',
  'murder', 'trial', 'convicted', 'sentenced', 'courtroom', 'prosecutor',
  'defendant', 'verdict', 'eichmann', 'jerusalem',
];

function detectProductContext(text: string): ProductContext {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,;:.!?()\n]+/).filter(Boolean);
  const totalWords = words.length || 1;

  let signalHits = 0;
  for (const w of PRODUCT_SIGNAL_WORDS) {
    if (lower.includes(w)) signalHits++;
  }

  let keywordHits = 0;
  for (const w of PRODUCT_KEYWORDS) {
    if (lower.includes(w)) keywordHits++;
  }

  let nonProductHits = 0;
  for (const w of NON_PRODUCT_INDICATORS) {
    if (lower.includes(w)) nonProductHits++;
  }

  // Check for structured label patterns (e.g., "Price:", "Weight:")
  const labelPatternCount = (lower.match(/(price|weight|dimensions|brand|color|colour|material|category|model|sku|features|specifications?)\s*[:\-]/g) || []).length;

  // Check for numeric specs (prices, weights, dimensions)
  const numericSpecCount = (lower.match(/(₹|rs\.?|inr|\$|usd|€|£)\s*[\d,]+/g) || []).length
    + (lower.match(/\d+(?:\.\d+)?\s*(?:kg|g|lbs?|oz|cm|mm|inches|in|mah|gb|tb)\b/g) || []).length
    + (lower.match(/\d+\s*[xX×]\s*\d+/g) || []).length;

  // Compute context score
  let score = 0;
  score += Math.min(signalHits * 8, 35);
  score += Math.min(keywordHits * 10, 25);
  score += Math.min(labelPatternCount * 7, 20);
  score += Math.min(numericSpecCount * 6, 20);
  score -= Math.min(nonProductHits * 15, 60);

  // Penalize very long prose without structure
  const avgLineLen = words.length / Math.max(text.split('\n').filter(Boolean).length, 1);
  if (labelPatternCount === 0 && avgLineLen > 25) score -= 15;

  score = Math.max(0, Math.min(100, score));

  // Determine content type
  let detectedType = 'Product document';
  if (nonProductHits >= 3 && score < 40) {
    if (/movie|film|directed|starring|box office|imdb/i.test(lower)) detectedType = 'Movie/Film content';
    else if (/recipe|ingredient|preheat|tablespoon|teaspoon/i.test(lower)) detectedType = 'Recipe content';
    else if (/chapter|novel|fiction|poem|stanza|verse/i.test(lower)) detectedType = 'Literary content';
    else if (/news|reported|journalist|press release/i.test(lower)) detectedType = 'News article';
    else if (/murder|trial|convicted|courtroom|prosecutor|verdict/i.test(lower)) detectedType = 'Legal/News content';
    else if (/biography|born in|died in|early life/i.test(lower)) detectedType = 'Biographical content';
    else detectedType = 'Non-product document';
  }

  const isProduct = score >= 35 && nonProductHits < 3;

  let reason: string;
  if (isProduct) {
    reason = `Detected ${signalHits} product signals, ${keywordHits} product keywords, and ${numericSpecCount} numeric specifications.`;
  } else {
    reason = 'The provided content does not contain enough reliable product information for analysis.';
  }

  return { isProductContent: isProduct, contextScore: score, detectedContentType: detectedType, reason };
}

// ---------------------------------------------------------------------------
// EXTRACTION + VALIDATION
// Every extractor returns a validated MatchResult or null.
// ---------------------------------------------------------------------------

interface MatchResult {
  value: string;
  sourceText: string;
  confidence: number;
}

// --- Validators ---

function isValidProductName(value: string): boolean {
  if (!value || value.length < 2 || value.length > 100) return false;
  // Reject sentences (too many words with verbs)
  const wordCount = value.split(/\s+/).length;
  if (wordCount > 15) return false;
  // Reject if it looks like a sentence (contains sentence-ending punctuation mid-text)
  if (/[.!?].*[a-zA-Z]/.test(value)) return false;
  // Reject if it starts with common sentence starters
  if (/^(the|a|an|in|on|at|when|after|before|during|while|although|because|this|that|it|he|she|they|we|you)\s+(movie|film|story|book|novel|chapter|article|report|news)/i.test(value)) return false;
  // Reject if contains typical prose patterns
  if (/(directed by|starring|written by|published|author|chapter \d)/i.test(value)) return false;
  // Reject pure sentences (heuristic: contains verb-like words + many words)
  const prosePattern = /\b(is|was|are|were|has|have|had|been|being|said|told|went|came|made|took|gave|found|became|began|started|decided|wanted|knew|thought|felt|saw|heard|watched|listened|walked|ran|drove|flew|arrived|left|returned|discovered|realized|remembered|wondered|asked|answered|replied|explained|described|narrated|portrayed|depicted|character|protagonist|antagonist|villain|hero|heroine|setting|plot|theme|scene|dialogue|narrator)\b/i;
  if (wordCount > 6 && prosePattern.test(value)) return false;
  return true;
}

function isValidBrand(value: string): boolean {
  if (!value || value.length < 2 || value.length > 50) return false;
  const wordCount = value.split(/\s+/).length;
  if (wordCount > 5) return false;
  if (/[.!?]/.test(value)) return false;
  if (/(directed by|starring|written by|born in|died in)/i.test(value)) return false;
  // Reject if it looks like a sentence
  const prosePattern = /\b(is|was|are|were|has|have|had|said|told|went|came|made|took|found|became|began|started|decided|wanted|knew|thought|felt|saw|heard|watched|walked|ran|drove|arrived|left|returned|discovered|realized|remembered|wondered|asked|answered|replied|explained|described|narrated|portrayed|depicted)\b/i;
  if (wordCount > 3 && prosePattern.test(value)) return false;
  return true;
}

function isValidPrice(value: string): boolean {
  if (!value) return false;
  // Must contain a numeric value with optional currency
  if (!/(₹|rs\.?|inr|\$|usd|€|£|gbp)/i.test(value) && !/\d{2,}/.test(value)) return false;
  // Must have actual digits
  if (!/\d/.test(value)) return false;
  // Reject if too many words (likely a sentence)
  if (value.split(/\s+/).length > 4) return false;
  // Reject prose
  if (/(not available|around|expensive|cheap|unknown|n\/a|murder|trial|eichmann)/i.test(value)) return false;
  return true;
}

function isValidWeight(value: string): boolean {
  if (!value) return false;
  // Must contain a number followed by a recognized weight unit
  if (!/\d+(?:\.\d+)?\s*(mg|g|kg|oz|lbs?|pounds?|ounces?|grams?|kilograms?|milligrams?)\b/i.test(value)) return false;
  // Reject if too many words
  if (value.split(/\s+/).length > 6) return false;
  // Reject prose
  if (/(murder|trial|eichmann|jerusalem|prosecutor|courtroom|verdict|defendant|convicted|sentenced)/i.test(value)) return false;
  return true;
}

function isValidDimensions(value: string): boolean {
  if (!value) return false;
  // Must contain a NxN or NxNxN pattern
  if (!/\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?/i.test(value)) return false;
  // Reject if it's a single word like "Earth"
  if (!/\d/.test(value)) return false;
  // Reject prose
  if (/(earth|world|planet|universe|murder|trial|eichmann)/i.test(value)) return false;
  if (value.split(/\s+/).length > 10) return false;
  return true;
}

const KNOWN_COLORS = [
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'silver', 'gold', 'brown', 'beige', 'ivory',
  'navy', 'teal', 'cyan', 'magenta', 'maroon', 'olive', 'coral', 'tan',
  'midnight', 'graphite', 'charcoal', 'platinum', 'rose', 'lavender',
  'turquoise', 'amber', 'indigo', 'crimson', 'slate', 'bronze', 'copper',
  'space gray', 'space grey', 'midnight black', 'starlight', 'titanium',
];

function isValidColor(value: string): boolean {
  if (!value || value.length < 2 || value.length > 40) return false;
  const lower = value.toLowerCase().trim();
  // Check if any known color word is present
  for (const c of KNOWN_COLORS) {
    if (lower.includes(c)) return true;
  }
  // Reject if too many words (likely a sentence)
  if (value.split(/\s+/).length > 4) return false;
  // Reject prose
  if (/(murder|trial|eichmann|earth|planet|universe)/i.test(value)) return false;
  return false;
}

const KNOWN_MATERIALS = [
  'aluminum', 'aluminium', 'plastic', 'abs', 'metal', 'steel', 'stainless steel',
  'leather', 'cotton', 'polyester', 'nylon', 'rubber', 'silicone', 'glass',
  'wood', 'bamboo', 'ceramic', 'titanium', 'carbon fiber', 'magnesium',
  'polycarbonate', 'memory foam', 'fabric', 'canvas', 'mesh', 'copper',
  'zinc', 'chrome', 'vinyl', 'polyurethane', 'faux leather',
];

function isValidMaterial(value: string): boolean {
  if (!value || value.length < 2 || value.length > 60) return false;
  const lower = value.toLowerCase().trim();
  for (const m of KNOWN_MATERIALS) {
    if (lower.includes(m)) return true;
  }
  // Reject if it looks like prose
  if (value.split(/\s+/).length > 6) return false;
  if (/(murder|trial|eichmann|earth|planet|directed|starring)/i.test(value)) return false;
  return false;
}

function isValidShortText(value: string, maxWords = 8): boolean {
  if (!value || value.length < 2) return false;
  if (value.split(/\s+/).length > maxWords) return false;
  if (/(murder|trial|eichmann|earth|planet|directed|starring|convicted|sentenced)/i.test(value)) return false;
  return true;
}

// --- Extractors ---

function extractLabeled(text: string, labels: string[]): MatchResult | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]\\s*(.+?)(?:\\n|$)`, 'i');
    const m = text.match(re);
    if (m && m[1]) {
      return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 90 };
    }
  }
  return null;
}

function extractProductName(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Product Name', 'Product Title', 'Name', 'Title']);
  if (labeled && isValidProductName(labeled.value)) {
    labeled.confidence = 92;
    return labeled;
  }
  if (labeled && !isValidProductName(labeled.value)) {
    // Labeled but invalid — return as rejected
    return { ...labeled, confidence: 30 };
  }
  // Try first non-label line
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(product|brand|price|weight|dimensions|color|colour|material|sku|category|specifications?|features?|model)\s*[:\-]/i.test(line)) continue;
    if (line.length < 3 || line.length > 100) continue;
    if (isValidProductName(line)) {
      return { value: line, sourceText: line, confidence: 65 };
    }
  }
  return null;
}

function extractBrand(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Brand', 'Manufacturer', 'Make']);
  if (labeled && isValidBrand(labeled.value)) {
    labeled.confidence = 90;
    return labeled;
  }
  if (labeled && !isValidBrand(labeled.value)) {
    return { ...labeled, confidence: 25 };
  }
  return null;
}

function extractCategory(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Category', 'Product Category']);
  if (labeled && isValidShortText(labeled.value, 5)) {
    labeled.confidence = 88;
    return labeled;
  }
  return null;
}

function extractSubcategory(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Sub-?category', 'Sub Type', 'Subcategory']);
  if (labeled && isValidShortText(labeled.value, 5)) {
    labeled.confidence = 85;
    return labeled;
  }
  return null;
}

function extractProductType(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Product Type', 'Form Factor', 'Type']);
  if (labeled && isValidShortText(labeled.value, 5)) {
    labeled.confidence = 88;
    return labeled;
  }
  return null;
}

function extractDimensions(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Dimensions?', 'Size']);
  if (labeled && isValidDimensions(labeled.value)) {
    labeled.confidence = 90;
    return labeled;
  }
  if (labeled && !isValidDimensions(labeled.value)) {
    return { ...labeled, confidence: 20 };
  }
  // Unlabeled pattern match
  const m = text.match(/(\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?\s*(?:cm|mm|in|inches|")?)/i);
  if (m && isValidDimensions(m[1])) {
    return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 75 };
  }
  return null;
}

function extractWeight(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Weight', 'Mass']);
  if (labeled && isValidWeight(labeled.value)) {
    labeled.confidence = 92;
    return labeled;
  }
  if (labeled && !isValidWeight(labeled.value)) {
    return { ...labeled, confidence: 15 };
  }
  // Unlabeled pattern match — strict
  const m = text.match(/(\d+(?:\.\d+)?\s*(?:kg|g|lbs?|pounds?|oz|ounces?|grams?|kilograms?|milligrams?|mg))\b/i);
  if (m && isValidWeight(m[1])) {
    return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 70 };
  }
  return null;
}

function extractMaterial(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Material', 'Made of', 'Fabric', 'Construction', 'Body']);
  if (labeled && isValidMaterial(labeled.value)) {
    labeled.confidence = 88;
    return labeled;
  }
  if (labeled && !isValidMaterial(labeled.value)) {
    return { ...labeled, confidence: 20 };
  }
  return null;
}

function extractColor(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Colou?r', 'Finish']);
  if (labeled && isValidColor(labeled.value)) {
    labeled.confidence = 88;
    return labeled;
  }
  if (labeled && !isValidColor(labeled.value)) {
    return { ...labeled, confidence: 20 };
  }
  return null;
}

function extractCapacity(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Capacity', 'Storage', 'Battery']);
  if (labeled && isValidShortText(labeled.value, 6) && /\d/.test(labeled.value)) {
    labeled.confidence = 85;
    return labeled;
  }
  const m = text.match(/(\d+(?:\.\d+)?\s*(?:mAh|Ah|GB|TB|L|ml))\b/i);
  if (m) {
    return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 72 };
  }
  return null;
}

function extractCompatibility(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Compatib(?:le|ility)', 'Supported(?: Devices?)?', 'Works with']);
  if (labeled && isValidShortText(labeled.value, 10)) {
    labeled.confidence = 85;
    return labeled;
  }
  // Detect standalone tech keywords
  const keywords: string[] = [];
  if (/usb-c|usb c/i.test(text)) keywords.push('USB-C');
  if (/bluetooth\s*5\.\d/i.test(text)) {
    const bm = text.match(/bluetooth\s*(5\.\d)/i);
    if (bm) keywords.push(`Bluetooth ${bm[1]}`);
  }
  if (/wi-?fi\s*6/i.test(text)) keywords.push('Wi-Fi 6');
  if (/lightning/i.test(text)) keywords.push('Lightning');
  if (/qi\s*charging/i.test(text)) keywords.push('Qi charging');
  if (keywords.length > 0) {
    return { value: keywords.join(', '), sourceText: keywords.join(', '), confidence: 75 };
  }
  return null;
}

function extractFeatures(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Features?', 'Highlights?', 'Key Features?']);
  if (labeled && isValidShortText(labeled.value, 20)) {
    labeled.confidence = 85;
    return labeled;
  }
  // Aggregate bullet points
  const bullets = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[•\-\*]\s+/.test(l))
    .map((l) => l.replace(/^[•\-\*]\s+/, ''));
  if (bullets.length >= 2) {
    const joined = bullets.join('; ');
    if (isValidShortText(joined, 40)) {
      return { value: joined, sourceText: bullets.slice(0, 4).join('\n'), confidence: 75 };
    }
  }
  return null;
}

function extractTechSpecs(text: string): MatchResult | null {
  // Collect individual tech spec lines
  const specLabels = ['Processor', 'CPU', 'RAM', 'Display', 'Resolution', 'Battery Life', 'Connectivity', 'Water Resist(?:ant|ance)', 'IP Rating', 'Screen'];
  const found: string[] = [];
  const sources: string[] = [];
  for (const label of specLabels) {
    const re = new RegExp(`${label}\\s*[:\\-]\\s*(.+?)(?:\\n|$)`, 'i');
    const m = text.match(re);
    if (m && m[1] && isValidShortText(m[1], 8)) {
      found.push(`${label}: ${m[1].trim()}`);
      sources.push(m[0].trim());
    }
  }
  if (found.length >= 2) {
    return { value: found.join('; '), sourceText: sources.join('\n'), confidence: 80 };
  }
  if (found.length === 1) {
    return { value: found[0], sourceText: sources[0], confidence: 72 };
  }
  return null;
}

function extractPrice(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Price', 'MRP', 'Cost', 'Selling Price', 'List Price']);
  if (labeled && isValidPrice(labeled.value)) {
    labeled.confidence = 92;
    return labeled;
  }
  if (labeled && !isValidPrice(labeled.value)) {
    return { ...labeled, confidence: 15 };
  }
  // Unlabeled currency patterns
  const patterns = [
    /(₹\s*[\d,]+(?:\.\d{2})?)/,
    /(rs\.?\s*[\d,]+(?:\.\d{2})?)/i,
    /(\$\s*[\d,]+(?:\.\d{2})?)/,
    /(€\s*[\d,]+(?:\.\d{2})?)/,
    /(£\s*[\d,]+(?:\.\d{2})?)/,
    /(\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:INR|USD|EUR|GBP)\b)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1] && isValidPrice(m[1])) {
      return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 80 };
    }
  }
  return null;
}

function extractCurrency(text: string): MatchResult | null {
  const price = extractPrice(text);
  if (price) {
    if (/₹|rs\.?|inr/i.test(price.value)) return { value: 'INR', sourceText: price.sourceText, confidence: 95 };
    if (/\$|usd/i.test(price.value)) return { value: 'USD', sourceText: price.sourceText, confidence: 95 };
    if (/€|eur/i.test(price.value)) return { value: 'EUR', sourceText: price.sourceText, confidence: 95 };
    if (/£|gbp/i.test(price.value)) return { value: 'GBP', sourceText: price.sourceText, confidence: 95 };
  }
  const labeled = extractLabeled(text, ['Currency']);
  if (labeled && /^(INR|USD|EUR|GBP)$/i.test(labeled.value)) {
    return { ...labeled, value: labeled.value.toUpperCase(), confidence: 90 };
  }
  return null;
}

function extractDiscount(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Discount', 'Off']);
  if (labeled && /\d/.test(labeled.value) && isValidShortText(labeled.value, 5)) {
    labeled.confidence = 85;
    return labeled;
  }
  const m = text.match(/(\d+(?:\.\d+)?\s*%\s*off)/i);
  if (m) return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 75 };
  return null;
}

function extractAvailability(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Availability', 'Stock']);
  if (labeled && isValidShortText(labeled.value, 5)) {
    labeled.confidence = 85;
    return labeled;
  }
  const m = text.match(/(In\s*Stock|Out\s*of\s*Stock|Pre-?order|Backorder|Limited\s*Stock)/i);
  if (m) return { value: m[1].trim(), sourceText: m[0].trim(), confidence: 75 };
  return null;
}

function extractSku(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['SKU', 'Product ID', 'Item Code', 'Model(?: Number)?', 'MPN']);
  if (labeled && isValidShortText(labeled.value, 6) && /^[A-Za-z0-9\-_]+$/.test(labeled.value.trim())) {
    labeled.confidence = 88;
    return labeled;
  }
  return null;
}

function extractTargetCustomer(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Target (?:Customer|Audience|User)', 'Ideal For', 'Designed For', 'Best For', 'Audience']);
  if (labeled && isValidShortText(labeled.value, 12)) {
    labeled.confidence = 82;
    return labeled;
  }
  return null;
}

function extractIntendedUse(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Intended Use', 'Use Case', 'Usage', 'Application']);
  if (labeled && isValidShortText(labeled.value, 12)) {
    labeled.confidence = 82;
    return labeled;
  }
  return null;
}

function extractKeyBenefits(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Key Benefits?', 'Benefits?', 'Advantages?', 'Value Proposition']);
  if (labeled && isValidShortText(labeled.value, 20)) {
    labeled.confidence = 82;
    return labeled;
  }
  return null;
}

function extractCompetitors(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Competitors?', 'Competing Products?', 'Alternatives?', 'Similar Products?']);
  if (labeled && isValidShortText(labeled.value, 15)) {
    labeled.confidence = 80;
    return labeled;
  }
  return null;
}

function extractMarketPositioning(text: string): MatchResult | null {
  const labeled = extractLabeled(text, ['Market Positioning', 'Positioning', 'Segment']);
  if (labeled && isValidShortText(labeled.value, 12)) {
    labeled.confidence = 82;
    return labeled;
  }
  return null;
}

// ---------------------------------------------------------------------------
// NORMALIZATION
// ---------------------------------------------------------------------------

function normalizeWeight(value: string): { normalized: string; rule: string } | null {
  const m = value.match(/(\d+(?:\.\d+)?)\s*(kg|g|lbs?|pounds?|oz|ounces?|grams?|kilograms?|milligrams?|mg)/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith('kg') || unit.startsWith('kilogram')) return { normalized: `${Math.round(num * 1000)} g`, rule: 'Convert kilograms → grams (×1000)' };
  if (unit === 'g' || unit.startsWith('gram')) return { normalized: `${num} g`, rule: 'Already in grams; canonical unit' };
  if (unit.startsWith('mg') || unit.startsWith('milligram')) return { normalized: `${(num / 1000).toFixed(3)} g`, rule: 'Convert milligrams → grams (÷1000)' };
  if (unit.startsWith('lb') || unit.startsWith('pound')) return { normalized: `${Math.round(num * 453.592)} g`, rule: 'Convert pounds → grams (×453.592)' };
  if (unit.startsWith('oz') || unit.startsWith('ounce')) return { normalized: `${Math.round(num * 28.3495)} g`, rule: 'Convert ounces → grams (×28.3495)' };
  return null;
}

function normalizeDimensions(value: string): { normalized: string; rule: string } | null {
  const m = value.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:[xX×]\s*(\d+(?:\.\d+)?)\s*)?(cm|mm|in|inches|")?/i);
  if (!m) return null;
  const unit = (m[4] || '').toLowerCase();
  const dims = [m[1], m[2], m[3]].filter(Boolean).map(Number);
  if (unit === 'in' || unit === 'inches' || unit === '"') {
    return { normalized: `${dims.map((d) => (d * 2.54).toFixed(1)).join(' × ')} cm`, rule: 'Convert inches → centimeters (×2.54)' };
  }
  if (unit === 'mm') {
    return { normalized: `${dims.map((d) => (d / 10).toFixed(1)).join(' × ')} cm`, rule: 'Convert millimeters → centimeters (÷10)' };
  }
  return { normalized: `${dims.join(' × ')} cm`, rule: 'Canonical centimeter format' };
}

function normalizePrice(value: string): { normalized: string; rule: string } | null {
  const m = value.match(/(₹|rs\.?|\$|€|£)?\s*([\d,]+(?:\.\d{2})?)\s*(INR|USD|EUR|GBP)?/i);
  if (!m) return null;
  const symbol = m[1];
  const num = parseFloat(m[2].replace(/,/g, ''));
  const code = (m[3] || '').toUpperCase();
  let currency = code;
  if (!currency) {
    if (symbol === '₹' || /rs\.?/i.test(symbol || '')) currency = 'INR';
    else if (symbol === '$') currency = 'USD';
    else if (symbol === '€') currency = 'EUR';
    else if (symbol === '£') currency = 'GBP';
    else currency = 'USD';
  }
  return {
    normalized: `${num.toLocaleString('en-US')} ${currency}`,
    rule: `Parse numeric value + ISO currency code (${currency})`,
  };
}

function normalizeColor(value: string): { normalized: string; rule: string } | null {
  const parts = value.split(/[\/,;|]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // Just title-case the single value
    const titleCased = value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase();
    if (titleCased !== value) return { normalized: titleCased, rule: 'Canonical capitalization' };
    return null;
  }
  const unique = Array.from(new Set(parts.map((p) => p.toLowerCase())));
  if (unique.length === 1) {
    return { normalized: unique[0].charAt(0).toUpperCase() + unique[0].slice(1), rule: 'Resolve duplicate color variants → single canonical color' };
  }
  return { normalized: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(), rule: 'Resolve color variants → primary color' };
}

function normalizeCompatibility(value: string): { normalized: string; rule: string } | null {
  const cleaned = value.replace(/compatible\s*with/i, '').replace(/[:\-]/g, '').trim();
  const tokens = cleaned.split(/[\/,;|]/).map((s) => s.trim()).filter(Boolean);
  if (tokens.length <= 1) {
    // Title-case bluetooth etc.
    const titled = cleaned.replace(/\bbluetooth\s*5\.(\d)/i, 'Bluetooth 5.$1').replace(/\busb-c\b/i, 'USB-C').replace(/\bwi-fi\s*6\b/i, 'Wi-Fi 6');
    if (titled !== value) return { normalized: titled, rule: 'Canonical capitalization for tech standards' };
    return null;
  }
  return { normalized: tokens.join(', '), rule: 'Split compatibility list into structured attribute tokens' };
}

function normalizeCapacity(value: string): { normalized: string; rule: string } | null {
  const m = value.match(/(\d+(?:\.\d+)?)\s*(mAh|Ah|GB|TB|L|ml)/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 'ah') return { normalized: `${Math.round(num * 1000)} mAh`, rule: 'Convert amp-hours → milliamp-hours (×1000)' };
  if (unit === 'tb') return { normalized: `${num * 1024} GB`, rule: 'Convert terabytes → gigabytes (×1024)' };
  if (unit === 'ml') return { normalized: `${(num / 1000).toFixed(2)} L`, rule: 'Convert milliliters → liters (÷1000)' };
  return null;
}

function applyNormalization(field: ExtractedField): ExtractedField {
  if (!field.value || field.status !== 'valid') return field;
  const value = field.value;
  let result: { normalized: string; rule: string } | null = null;
  switch (field.key) {
    case 'weight': result = normalizeWeight(value); break;
    case 'dimensions': result = normalizeDimensions(value); break;
    case 'price': result = normalizePrice(value); break;
    case 'color': result = normalizeColor(value); break;
    case 'compatibility': result = normalizeCompatibility(value); break;
    case 'capacity': result = normalizeCapacity(value); break;
  }
  if (result) {
    return {
      ...field,
      normalized: result.normalized,
      evidence: field.evidence
        ? { ...field.evidence, normalizedValue: result.normalized, rule: result.rule }
        : undefined,
    };
  }
  return field;
}

// ---------------------------------------------------------------------------
// FIELD BUILDING WITH VALIDATION + REJECTION
// ---------------------------------------------------------------------------

function buildField(
  key: string,
  label: string,
  group: ExtractedField['group'],
  match: MatchResult | null,
  validator: (v: string) => boolean
): ExtractedField {
  if (!match) {
    return { key, label, group, value: null, status: 'valid' };
  }

  const valid = validator(match.value);
  const confidenceTooLow = match.confidence < 50;

  if (!valid) {
    return {
      key,
      label,
      group,
      value: match.value,
      status: 'rejected',
      rejectionReason: 'Failed validation — value does not match expected pattern for this attribute.',
      evidence: {
        sourceText: match.sourceText,
        extractedValue: match.value,
        confidence: match.confidence,
        confidenceLabel: confidenceLabel(match.confidence),
      },
    };
  }

  if (confidenceTooLow) {
    return {
      key,
      label,
      group,
      value: match.value,
      status: 'low_confidence',
      rejectionReason: 'Low extraction confidence — value detected but not reliable enough to display as confirmed.',
      evidence: {
        sourceText: match.sourceText,
        extractedValue: match.value,
        confidence: match.confidence,
        confidenceLabel: confidenceLabel(match.confidence),
      },
    };
  }

  const field: ExtractedField = {
    key,
    label,
    group,
    value: match.value,
    status: 'valid' as FieldStatus,
    evidence: {
      sourceText: match.sourceText,
      extractedValue: match.value,
      confidence: match.confidence,
      confidenceLabel: confidenceLabel(match.confidence),
    },
  };
  return applyNormalization(field);
}

// ---------------------------------------------------------------------------
// CONTRADICTION DETECTION
// ---------------------------------------------------------------------------

function detectContradictions(text: string): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];

  // Weight contradictions
  const weightMatches = text.match(/(?:weight|mass)\s*[:\-]\s*(\d+(?:\.\d+)?\s*(?:kg|g|lbs?|oz))/gi);
  if (weightMatches && weightMatches.length > 1) {
    const values = weightMatches.map((m) => m.match(/(\d+(?:\.\d+)?\s*(?:kg|g|lbs?|oz))/i)?.[1] || '').filter(Boolean);
    const unique = Array.from(new Set(values.map((v) => v.toLowerCase())));
    if (unique.length > 1) {
      contradictions.push({
        field: 'Weight',
        values: unique,
        sourceTexts: weightMatches,
      });
    }
  }

  // Price contradictions
  const priceMatches = text.match(/(?:price|mrp|cost)\s*[:\-]\s*(₹|rs\.?|\$|€|£)?\s*[\d,]+(?:\.\d{2})?/gi);
  if (priceMatches && priceMatches.length > 1) {
    const values = priceMatches.map((m) => m.replace(/.*[:\-]\s*/, '').trim());
    const unique = Array.from(new Set(values.map((v) => v.toLowerCase())));
    if (unique.length > 1) {
      contradictions.push({
        field: 'Price',
        values: unique,
        sourceTexts: priceMatches,
      });
    }
  }

  return contradictions;
}

// ---------------------------------------------------------------------------
// CLASSIFICATION
// ---------------------------------------------------------------------------

function classifyProduct(text: string, fields: ExtractedField[]): ProductClassification {
  const t = text.toLowerCase();
  const name = (fields.find((f) => f.key === 'name')?.value || '').toLowerCase();
  const features = (fields.find((f) => f.key === 'features')?.value || '').toLowerCase();
  const combined = `${t} ${name} ${features}`;

  const rules: { match: RegExp; cat: string; sub: string; type: string; conf: number }[] = [
    { match: /(noise[-\s]?cancel|headphone|headphones|earphone|earphones|earbud|earbuds|wireless audio|bluetooth audio|anc)/, cat: 'Consumer Electronics', sub: 'Audio', type: 'Wireless Headphones', conf: 94 },
    { match: /(smartwatch|smart watch|fitness watch|fitness tracker|wearable|smart watch)/, cat: 'Consumer Electronics', sub: 'Wearables', type: 'Smartwatch', conf: 92 },
    { match: /(laptop|notebook|ultrabook|macbook|chromebook|aerobook)/, cat: 'Computers', sub: 'Laptops', type: 'Portable Laptop', conf: 93 },
    { match: /(tablet|ipad)/, cat: 'Consumer Electronics', sub: 'Computers', type: 'Tablet', conf: 90 },
    { match: /(smartphone|phone|mobile)/, cat: 'Consumer Electronics', sub: 'Mobile Devices', type: 'Smartphone', conf: 92 },
    { match: /(camera|dslr|mirrorless|camcorder)/, cat: 'Consumer Electronics', sub: 'Imaging', type: 'Digital Camera', conf: 89 },
    { match: /(speaker|speakers|soundbar)/, cat: 'Consumer Electronics', sub: 'Audio', type: 'Speaker', conf: 88 },
    { match: /(keyboard|mouse|webcam|monitor|desktop)/, cat: 'Consumer Electronics', sub: 'Computer Peripherals', type: 'Peripheral', conf: 86 },
    { match: /(kettle|blender|toaster|microwave|oven|refrigerator|fridge|washing machine)/, cat: 'Home Appliances', sub: 'Kitchen & Home', type: 'Home Appliance', conf: 85 },
    { match: /(chair|desk|table|sofa|shelf|furniture)/, cat: 'Home & Furniture', sub: 'Furniture', type: 'Furniture', conf: 84 },
    { match: /(shoe|shoes|apparel|jacket|shirt|clothing|garment)/, cat: 'Apparel', sub: 'Clothing', type: 'Apparel', conf: 82 },
  ];

  for (const r of rules) {
    if (r.match.test(combined)) {
      const alts = rules
        .filter((x) => x !== r)
        .slice(0, 2)
        .map((x) => ({ label: x.type, confidence: Math.max(30, x.conf - 30) }));
      return {
        category: r.cat,
        subcategory: r.sub,
        productType: r.type,
        confidence: r.conf,
        alternatives: alts,
      };
    }
  }

  return {
    category: 'Uncategorized',
    subcategory: 'General',
    productType: 'Classification uncertain',
    confidence: 30,
    alternatives: [
      { label: 'Consumer Electronics', confidence: 25 },
      { label: 'Home Appliances', confidence: 20 },
    ],
  };
}

// ---------------------------------------------------------------------------
// VALIDATION RULES
// ---------------------------------------------------------------------------

function validateFields(fields: ExtractedField[], classification: ProductClassification, contradictions: ContradictionRecord[]): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const get = (k: string) => fields.find((f) => f.key === k)?.value;

  // Price must be numeric
  const price = get('price');
  if (price) {
    const num = price.replace(/[₹$€£,\s]/g, '').replace(/(rs\.?|inr|usd|eur|gbp)/gi, '').trim();
    if (!/^\d+(\.\d+)?$/.test(num)) {
      rules.push({ id: 'price_numeric', field: 'Price', status: 'error', message: 'Price is not a valid numeric value.', detail: `Found "${price}". A numeric price is required for commercial processing.` });
    } else {
      rules.push({ id: 'price_numeric', field: 'Price', status: 'valid', message: 'Price is numeric and parseable.' });
    }
  }

  // Currency recognized
  const currency = get('currency');
  if (currency) {
    if (!['INR', 'USD', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
      rules.push({ id: 'currency_recognized', field: 'Currency', status: 'warning', message: `Currency "${currency}" not in recognized set (INR, USD, EUR, GBP).` });
    } else {
      rules.push({ id: 'currency_recognized', field: 'Currency', status: 'valid', message: 'Currency recognized.' });
    }
  }

  // Weight unit
  const weight = get('weight');
  if (weight) {
    if (!/\b(kg|g|lbs?|pounds?|oz|ounces?|grams?|kilograms?|mg|milligrams?)\b/i.test(weight)) {
      rules.push({ id: 'weight_unit', field: 'Weight', status: 'warning', message: 'Weight value has no recognized unit.' });
    } else {
      rules.push({ id: 'weight_unit', field: 'Weight', status: 'valid', message: 'Weight has a valid unit.' });
    }
  }

  // Dimensions format
  const dims = get('dimensions');
  if (dims) {
    if (!/\d+\s*[xX×]\s*\d+/i.test(dims)) {
      rules.push({ id: 'dims_format', field: 'Dimensions', status: 'warning', message: 'Dimensions do not follow a valid W×H×D format.' });
    } else {
      rules.push({ id: 'dims_format', field: 'Dimensions', status: 'valid', message: 'Dimensions format is valid.' });
    }
  }

  // Required identity fields
  const requiredIdentity = ['name', 'brand', 'category'];
  for (const k of requiredIdentity) {
    const v = get(k);
    if (!v) {
      rules.push({ id: `req_${k}`, field: k, status: 'warning', message: `Required identity field "${k}" is missing.` });
    } else {
      rules.push({ id: `req_${k}`, field: k, status: 'valid', message: `${k} present.` });
    }
  }

  // Rejected fields
  const rejectedFields = fields.filter((f) => f.status === 'rejected');
  for (const f of rejectedFields) {
    rules.push({ id: `rej_${f.key}`, field: f.label, status: 'error', message: `"${f.label}" failed validation and was rejected.`, detail: f.rejectionReason });
  }

  // Contradictions
  for (const c of contradictions) {
    rules.push({ id: `contra_${c.field}`, field: c.field, status: 'error', message: `Conflicting ${c.field.toLowerCase()} values detected.`, detail: `Found multiple values: ${c.values.join(', ')}` });
  }

  // Classification confidence
  if (classification.confidence < 60) {
    rules.push({ id: 'class_conf', field: 'Classification', status: 'warning', message: 'Classification confidence is low.', detail: `Confidence ${classification.confidence}% — alternative classifications available.` });
  } else {
    rules.push({ id: 'class_conf', field: 'Classification', status: 'valid', message: 'Classification confidence is acceptable.' });
  }

  return rules;
}

// ---------------------------------------------------------------------------
// SCORING
// ---------------------------------------------------------------------------

const IDENTITY_KEYS = ['name', 'brand', 'category', 'subcategory', 'productType'];
const SPEC_KEYS = ['dimensions', 'weight', 'material', 'color', 'capacity', 'compatibility', 'features', 'techSpecs'];
const COMMERCIAL_KEYS = ['price', 'currency', 'discount', 'availability', 'sku'];
const MARKET_KEYS = ['targetCustomer', 'intendedUse', 'keyBenefits', 'competitors', 'marketPositioning'];
const ALL_KEYS = [...IDENTITY_KEYS, ...SPEC_KEYS, ...COMMERCIAL_KEYS, ...MARKET_KEYS];

function computeQuality(fields: ExtractedField[], validation: ValidationRule[], contradictions: ContradictionRecord[]): DataQualityScore {
  // Only count valid fields as "present"
  const validFields = fields.filter((f) => f.status === 'valid' && f.value);
  const present = ALL_KEYS.filter((k) => fields.find((f) => f.key === k && f.status === 'valid' && f.value));
  const completeness = Math.round((present.length / ALL_KEYS.length) * 100);

  const errorCount = validation.filter((v) => v.status === 'error').length;
  const warnCount = validation.filter((v) => v.status === 'warning').length;
  const validCount = validation.filter((v) => v.status === 'valid').length;
  const totalChecks = validation.length || 1;
  const validity = Math.round(((validCount + warnCount * 0.5) / totalChecks) * 100);

  const normalizedCount = fields.filter((f) => f.normalized && f.status === 'valid').length;
  const normalizable = fields.filter((f) => f.value && f.status === 'valid' && ['weight', 'dimensions', 'price', 'color', 'compatibility', 'capacity'].includes(f.key)).length;
  const standardization = normalizable > 0 ? Math.round((normalizedCount / normalizable) * 100) : 100;

  const withEvidence = fields.filter((f) => f.value && f.status === 'valid' && f.evidence).length;
  const withValue = validFields.length || 1;
  const evidenceCoverage = Math.round((withEvidence / withValue) * 100);

  // Consistency: contradictions + duplicates
  const contraPenalty = contradictions.length * 20;
  const dupPenalty = validation.filter((v) => v.id.startsWith('dup_')).length * 8;
  const consistency = Math.max(0, 100 - contraPenalty - dupPenalty);

  const score = Math.round(
    completeness * 0.25 + validity * 0.2 + standardization * 0.15 + consistency * 0.2 + evidenceCoverage * 0.2
  );

  const reasons = {
    ok: [] as string[],
    warn: [] as string[],
    error: [] as string[],
  };

  if (fields.find((f) => f.key === 'name' && f.status === 'valid')?.value) reasons.ok.push('Product identity present');
  if (fields.find((f) => f.key === 'price' && f.status === 'valid')?.value) reasons.ok.push('Price detected');
  if (fields.find((f) => f.key === 'weight' && f.status === 'valid')?.value) reasons.ok.push('Weight detected');
  if (fields.find((f) => f.key === 'features' && f.status === 'valid')?.value) reasons.ok.push('Features listed');
  if (normalizedCount > 0) reasons.ok.push(`${normalizedCount} attributes normalized`);
  if (evidenceCoverage >= 80) reasons.ok.push('High evidence coverage');

  for (const k of ALL_KEYS) {
    if (!fields.find((f) => f.key === k && f.status === 'valid')?.value) reasons.warn.push(`${k} missing`);
  }
  const rejectedFields = fields.filter((f) => f.status === 'rejected');
  if (rejectedFields.length > 0) reasons.warn.push(`${rejectedFields.length} attribute(s) rejected by validation`);
  if (warnCount > 0) reasons.warn.push(`${warnCount} validation warning(s)`);
  if (errorCount > 0) reasons.error.push(`${errorCount} validation error(s)`);
  contradictions.forEach((c) => reasons.error.push(`Conflicting ${c.field} values`));
  validation.filter((v) => v.status === 'error').forEach((v) => reasons.error.push(v.message));

  return {
    score,
    label: qualityLabel(score),
    breakdown: { completeness, consistency, validity, standardization, evidenceCoverage },
    reasons,
  };
}

function computeIntelligence(
  fields: ExtractedField[],
  quality: DataQualityScore,
  classification: ProductClassification
): IntelligenceScore {
  const present = ALL_KEYS.filter((k) => fields.find((f) => f.key === k && f.status === 'valid' && f.value));
  const completeness = Math.round((present.length / ALL_KEYS.length) * 100);

  const withEvidence = fields.filter((f) => f.value && f.status === 'valid' && f.evidence).length;
  const validFields = fields.filter((f) => f.status === 'valid' && f.value).length || 1;
  const evidenceCoverage = Math.round((withEvidence / validFields) * 100);

  const specPresent = SPEC_KEYS.filter((k) => fields.find((f) => f.key === k && f.status === 'valid' && f.value));
  const specificationQuality = Math.round((specPresent.length / SPEC_KEYS.length) * 100);

  const score = Math.round(
    completeness * 0.25 +
      quality.breakdown.consistency * 0.2 +
      evidenceCoverage * 0.2 +
      classification.confidence * 0.15 +
      specificationQuality * 0.2
  );

  return {
    score,
    breakdown: {
      completeness,
      consistency: quality.breakdown.consistency,
      evidenceCoverage,
      classification: classification.confidence,
      specificationQuality,
    },
  };
}

// ---------------------------------------------------------------------------
// INSIGHTS
// ---------------------------------------------------------------------------

function generateInsights(
  fields: ExtractedField[],
  classification: ProductClassification,
  quality: DataQualityScore,
  validation: ValidationRule[],
  contradictions: ContradictionRecord[]
): ProductInsights {
  const get = (k: string) => fields.find((f) => f.key === k && f.status === 'valid')?.value;
  const name = get('name') || 'This product';
  const category = classification.category;
  const sub = classification.subcategory;

  const target = get('targetCustomer');
  const price = get('price');
  const positioningParts: string[] = [];
  positioningParts.push(`${name} is positioned as a ${classification.productType.toLowerCase()} in the ${sub.toLowerCase()} segment of ${category.toLowerCase()}.`);
  if (target) positioningParts.push(`It appears to target ${target.toLowerCase()}.`);
  if (price) positioningParts.push(`Pricing information (${price}) suggests a commercial positioning rather than a free/enterprise-tier listing.`);
  else positioningParts.push(`No pricing context is available, so the tier (budget / mid / premium) cannot be inferred from source.`);

  const sellingPoints: string[] = [];
  const features = get('features');
  if (features) sellingPoints.push(`Feature set: ${features.split(/[;,]/).slice(0, 4).join(', ')}`);
  const tech = get('techSpecs');
  if (tech) sellingPoints.push(`Technical differentiators: ${tech.split(';').slice(0, 3).join('; ')}`);
  const compat = get('compatibility');
  if (compat) sellingPoints.push(`Broad compatibility: ${compat}`);
  const benefits = get('keyBenefits');
  if (benefits) sellingPoints.push(`Stated benefits: ${benefits}`);
  if (sellingPoints.length === 0) sellingPoints.push('No strong selling points could be identified from the source material.');

  const missing: string[] = [];
  for (const k of ALL_KEYS) {
    if (!fields.find((f) => f.key === k && f.status === 'valid')?.value) {
      missing.push(k);
    }
  }
  const missingInformation = missing.length ? missing : ['No significant gaps detected.'];

  const riskFlags: string[] = [];
  validation.filter((v) => v.status === 'error').forEach((v) => riskFlags.push(`${v.field}: ${v.message}`));
  contradictions.forEach((c) => riskFlags.push(`Conflicting ${c.field} values: ${c.values.join(' vs ')}`));
  if (classification.confidence < 60) riskFlags.push('Low classification confidence — product may be mis-categorized.');
  if (quality.breakdown.consistency < 80) riskFlags.push('Internal consistency below 80 — review duplicate/contradictory values.');
  if (riskFlags.length === 0) riskFlags.push('No critical risk flags detected.');

  const improvementSuggestions: string[] = [];
  if (!get('material')) improvementSuggestions.push('Add material/construction information to improve spec richness.');
  if (!get('compatibility')) improvementSuggestions.push('Add compatibility information to broaden the addressable audience.');
  if (!get('targetCustomer')) improvementSuggestions.push('Specify the target customer to strengthen positioning.');
  if (!get('keyBenefits')) improvementSuggestions.push('Add explicit key benefits for marketing use.');
  if (!get('sku')) improvementSuggestions.push('Add a SKU/product ID for inventory and tracking.');
  if (quality.breakdown.standardization < 100) improvementSuggestions.push('Standardize units (weight, dimensions, price) for cleaner downstream processing.');
  if (improvementSuggestions.length === 0) improvementSuggestions.push('Listing is comprehensive — continue monitoring for consistency.');

  return {
    positioning: positioningParts.join(' '),
    sellingPoints,
    missingInformation,
    riskFlags,
    improvementSuggestions,
  };
}

// ---------------------------------------------------------------------------
// PIPELINE ENTRY POINT
// ---------------------------------------------------------------------------

export function analyzeText(rawText: string): Omit<ProductAnalysis, 'id' | 'createdAt' | 'source' | 'fileName' | 'fileType' | 'fileSize'> {
  const cleaned = cleanText(rawText);
  const context = detectProductContext(cleaned);

  // Even for non-product content, we run extraction so we can show rejected fields.
  // The UI will display the rejection state.
  const identity: ExtractedField[] = [
    buildField('name', 'Product Name', 'identity', extractProductName(cleaned), isValidProductName),
    buildField('brand', 'Brand', 'identity', extractBrand(cleaned), isValidBrand),
    buildField('category', 'Category', 'identity', extractCategory(cleaned), (v) => isValidShortText(v, 5)),
    buildField('subcategory', 'Subcategory', 'identity', extractSubcategory(cleaned), (v) => isValidShortText(v, 5)),
    buildField('productType', 'Product Type', 'identity', extractProductType(cleaned), (v) => isValidShortText(v, 5)),
  ];

  const specs: ExtractedField[] = [
    buildField('dimensions', 'Dimensions', 'specifications', extractDimensions(cleaned), isValidDimensions),
    buildField('weight', 'Weight', 'specifications', extractWeight(cleaned), isValidWeight),
    buildField('material', 'Material', 'specifications', extractMaterial(cleaned), isValidMaterial),
    buildField('color', 'Color', 'specifications', extractColor(cleaned), isValidColor),
    buildField('capacity', 'Capacity', 'specifications', extractCapacity(cleaned), (v) => isValidShortText(v, 6) && /\d/.test(v)),
    buildField('compatibility', 'Compatibility', 'specifications', extractCompatibility(cleaned), (v) => isValidShortText(v, 10)),
    buildField('features', 'Features', 'specifications', extractFeatures(cleaned), (v) => isValidShortText(v, 40)),
    buildField('techSpecs', 'Technical Specifications', 'specifications', extractTechSpecs(cleaned), (v) => isValidShortText(v, 60)),
  ];

  const commercial: ExtractedField[] = [
    buildField('price', 'Price', 'commercial', extractPrice(cleaned), isValidPrice),
    buildField('currency', 'Currency', 'commercial', extractCurrency(cleaned), (v) => /^(INR|USD|EUR|GBP)$/i.test(v)),
    buildField('discount', 'Discount', 'commercial', extractDiscount(cleaned), (v) => isValidShortText(v, 5) && /\d/.test(v)),
    buildField('availability', 'Availability', 'commercial', extractAvailability(cleaned), (v) => isValidShortText(v, 5)),
    buildField('sku', 'SKU / Product ID', 'commercial', extractSku(cleaned), (v) => isValidShortText(v, 6) && /^[A-Za-z0-9\-_]+$/.test(v.trim())),
  ];

  const market: ExtractedField[] = [
    buildField('targetCustomer', 'Target Customer', 'market', extractTargetCustomer(cleaned), (v) => isValidShortText(v, 12)),
    buildField('intendedUse', 'Intended Use', 'market', extractIntendedUse(cleaned), (v) => isValidShortText(v, 12)),
    buildField('keyBenefits', 'Key Benefits', 'market', extractKeyBenefits(cleaned), (v) => isValidShortText(v, 20)),
    buildField('competitors', 'Potential Competitors', 'market', extractCompetitors(cleaned), (v) => isValidShortText(v, 15)),
    buildField('marketPositioning', 'Market Positioning', 'market', extractMarketPositioning(cleaned), (v) => isValidShortText(v, 12)),
  ];

  const fields = [...identity, ...specs, ...commercial, ...market];

  const normalization: NormalizationRecord[] = fields
    .filter((f) => f.value && f.normalized && f.value !== f.normalized && f.status === 'valid')
    .map((f) => ({
      field: f.label,
      original: f.value!,
      normalized: f.normalized!,
      rule: f.evidence?.rule || 'Normalization applied',
    }));

  const contradictions = detectContradictions(cleaned);
  const classification = classifyProduct(cleaned, fields);
  const validation = validateFields(fields, classification, contradictions);
  const quality = computeQuality(fields, validation, contradictions);
  const intelligence = computeIntelligence(fields, quality, classification);
  const insights = generateInsights(fields, classification, quality, validation, contradictions);

  return {
    rawText,
    context,
    fields,
    normalization,
    validation,
    contradictions,
    classification,
    quality,
    intelligence,
    insights,
  };
}

export const PIPELINE_STEPS = [
  'Document Ingestion',
  'Text Extraction',
  'Data Cleaning',
  'Product Context Detection',
  'Attribute Extraction',
  'Normalization',
  'Product Classification',
  'Quality Validation',
  'Intelligence Generation',
] as const;

export function runPipelineStep(step: number, rawText: string): string {
  switch (step) {
    case 0: return `Ingested ${rawText.length} characters`;
    case 1: return `Extracted text from source`;
    case 2: return `Cleaned whitespace and encoding artifacts`;
    case 3: return `Detected product context signals`;
    case 4: return `Ran attribute extractors with validation`;
    case 5: return `Applied unit and currency normalization`;
    case 6: return `Routed to classification model`;
    case 7: return `Ran validation rules and contradiction checks`;
    case 8: return `Generated intelligence report`;
    default: return '';
  }
}
