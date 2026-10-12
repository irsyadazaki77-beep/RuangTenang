export interface GuidelineEvidence {
  citationId: string;
  documentId: string;
  filename: string;
  sourceRef: string;
  excerpt: string;
}

export type ExtractedGuidelineType =
  | 'maximum_pages' | 'font_family' | 'font_size' | 'margin' | 'line_spacing'
  | 'minimum_references' | 'citation_style' | 'required_section' | 'required_table' | 'cover_page' | 'filename';

export interface ExtractedGuidelineRule {
  id: string;
  type: ExtractedGuidelineType;
  value: string;
  status: 'literal_match' | 'ambiguous';
  citationId: string;
  documentId: string;
  filename: string;
  sourceRef: string;
  excerpt: string;
}

const RULES: Array<{ type: ExtractedGuidelineType; pattern: RegExp; value: (match: RegExpMatchArray) => string }> = [
  { type: 'maximum_pages', pattern: /\b(?:maksimal|maximum|max\.?|paling banyak|tidak lebih dari|no more than)\s*(?:(?:of|sebanyak)\s*)?(\d{1,3})\s*(?:halaman|pages?)\b/gi, value: match => `${match[1]} halaman` },
  { type: 'font_family', pattern: /\b(times new roman|arial|calibri|aptos|cambria|georgia)\b/gi, value: match => match[1] },
  { type: 'font_size', pattern: /\b(?:(?:ukuran\s+font|font(?:\s+size)?)\s*(?:adalah|:|=)?\s*|(?:times new roman|arial|calibri|aptos|cambria|georgia)\s+)(\d{1,2}(?:[.,]\d+)?)\s*(?:pt|poin)\b/gi, value: match => `${match[1].replace(',', '.')} pt` },
  { type: 'margin', pattern: /\b(?:margin\s+)?(atas|bawah|kiri|kanan|top|bottom|left|right)\s*(?:adalah|:|=)?\s*(\d+(?:[.,]\d+)?)\s*cm\b/gi, value: match => `${match[1]} ${match[2].replace(',', '.')} cm` },
  { type: 'line_spacing', pattern: /\b(?:spasi|line\s+spacing)\s*(?:adalah|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:kali|x|lines?)?\b/gi, value: match => `${match[1].replace(',', '.')} spasi` },
  { type: 'minimum_references', pattern: /\b(?:minimal|minimum|sekurang-kurangnya|at least)\s*(\d{1,3})\s*(?:referensi|references|sumber|sources)\b/gi, value: match => `${match[1]} referensi` },
  { type: 'citation_style', pattern: /\b(APA\s*7(?:th)?|IEEE|Harvard|Vancouver)\b/gi, value: match => match[1].replace(/\s+/g, ' ').toUpperCase() },
  { type: 'required_section', pattern: /\b(?:wajib(?:\s+mencakup)?|harus mencakup|must include|required section(?:s)? include)\s+(abstrak|abstract|pendahuluan|introduction|metode|methods|hasil|results|pembahasan|discussion|kesimpulan|conclusion)\b/gi, value: match => match[1] },
  { type: 'required_table', pattern: /\b(?:wajib|harus|required|must include)\s+(?:menyertakan\s+)?(tabel|table)(?:\s+([^.;\n]{1,80}))?/gi, value: match => `Tabel${match[2] ? ` ${match[2].trim()}` : ''}` },
  { type: 'cover_page', pattern: /\b(?:halaman sampul|cover page|cover sheet)\b/gi, value: match => match[0] },
  { type: 'filename', pattern: /\b(?:nama file|filename|file name)\s*(?:harus|wajib|must be|:|=)?\s*["'`]?([A-Za-z0-9_.{}-]{3,80})/gi, value: match => match[1] }
];

/** Extracts only literal, source-quoted format requirements. It does not decide compliance. */
export function extractAssignmentGuidelineRules(evidence: GuidelineEvidence[]): ExtractedGuidelineRule[] {
  const rules: ExtractedGuidelineRule[] = [];
  for (const item of evidence) {
    for (const definition of RULES) {
      definition.pattern.lastIndex = 0;
      for (const match of item.excerpt.matchAll(definition.pattern)) {
        const value = definition.value(match);
        const ruleId = `${item.citationId}:${definition.type}:${match.index ?? 0}`;
        const start = Math.max(0, (match.index ?? 0) - 100);
        const ruleContext = item.excerpt.slice(start, Math.min(item.excerpt.length, (match.index ?? 0) + match[0].length + 100));
        const explicitRuleLanguage = /\b(wajib|harus|gunakan|gunakanlah|required|must|should|minimal|minimum|maksimal|maximum|at least|tidak lebih dari|paling banyak)\b/i.test(ruleContext);
        const excerptStart = Math.max(0, (match.index ?? 0) - 140);
        const excerptEnd = Math.min(item.excerpt.length, (match.index ?? 0) + match[0].length + 140);
        rules.push({
          id: ruleId,
          type: definition.type,
          value: value.slice(0, 120),
          status: explicitRuleLanguage ? 'literal_match' : 'ambiguous',
          citationId: item.citationId,
          documentId: item.documentId,
          filename: item.filename,
          sourceRef: item.sourceRef,
          excerpt: item.excerpt.slice(excerptStart, excerptEnd)
        });
      }
    }
  }
  return rules;
}
