/**
 * Client-Side PII Detection & Sanitization Utility
 */

export interface ClientPiiResult {
  hasPii: boolean;
  sanitizedText: string;
  detectedTypes: string[];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+62|62|08)[\s.-]?[1-9](?:[\s.-]?\d){7,11}\b/g;
const NIK_REGEX = /\b[1-9]\d{15}\b/g;
const NIM_REGEX = /\b(?:\d{8,14}|\d{2}\/\d{6}\/[A-Za-z]{2,4}\/\d{4,5})\b/g;
const ADDRESS_REGEX = /\b(?:Jl\.|Jalan|Gg\.|Gang|Komplek|RT\s*\d+|RW\s*\d+|Kec\.|Kab\.|Kel\.|Desa)\s+[A-Za-z0-9\s.,-]+/gi;

export function detectClientPII(text: string): ClientPiiResult {
  if (!text) return { hasPii: false, sanitizedText: '', detectedTypes: [] };

  const detected: string[] = [];
  let sanitized = text;

  const applyClientRedaction = (regex: RegExp, typeName: string, replacement: string) => {
    const before = sanitized;
    regex.lastIndex = 0;
    sanitized = sanitized.replace(regex, replacement);
    if (sanitized !== before) {
      detected.push(typeName);
    }
  };

  applyClientRedaction(EMAIL_REGEX, 'Email', '[EMAIL_TERSEMBUNYI]');
  applyClientRedaction(PHONE_REGEX, 'Nomor HP', '[NOMOR_HP_TERSEMBUNYI]');
  applyClientRedaction(NIK_REGEX, 'NIK/KTP', '[NIK_TERSEMBUNYI]');
  applyClientRedaction(NIM_REGEX, 'NIM', '[NIM_TERSEMBUNYI]');
  applyClientRedaction(ADDRESS_REGEX, 'Alamat', '[ALAMAT_TERSEMBUNYI]');

  return {
    hasPii: detected.length > 0,
    sanitizedText: sanitized,
    detectedTypes: detected
  };
}
