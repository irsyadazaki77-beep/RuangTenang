/**
 * PII (Personally Identifiable Information) Detection & Redaction Service
 * High-precision regex and heuristic pattern matching for sensitive Indonesian & global identity data.
 */

export interface PiiScanResult {
  hasPii: boolean;
  sanitizedText: string;
  detectedTypes: string[];
}

export function scanAndSanitizePII(input: string): PiiScanResult {
  if (!input || typeof input !== 'string') {
    return { hasPii: false, sanitizedText: input || '', detectedTypes: [] };
  }

  let sanitized = input;
  const detectedTypes: Set<string> = new Set();

  // Helper to safely apply global regex replacement without lastIndex side-effects
  const applyRedaction = (regex: RegExp, type: string, replacement: string | ((substring: string, ...args: any[]) => string)) => {
    const before = sanitized;
    // Reset lastIndex just in case
    regex.lastIndex = 0;
    if (typeof replacement === 'string') {
      sanitized = sanitized.replace(regex, replacement);
    } else {
      sanitized = sanitized.replace(regex, replacement);
    }
    if (sanitized !== before) {
      detectedTypes.add(type);
    }
  };

  // 1. Email Redaction
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  applyRedaction(EMAIL_REGEX, 'email', '[EMAIL_TERSEMBUNYI]');

  // 2. Indonesian Phone Redaction (supporting spaces, hyphens, and formats like +62 812..., 62-812..., 0812...)
  const ID_PHONE_REGEX = /(?:\+62|62|08)[\s.-]?[1-9](?:[\s.-]?\d){7,11}\b/g;
  applyRedaction(ID_PHONE_REGEX, 'phone', '[NOMOR_HP_TERSEMBUNYI]');

  // 3. NIK Redaction (16 digits)
  const NIK_REGEX = /\b[1-9]\d{15}\b/g;
  applyRedaction(NIK_REGEX, 'nik', '[NIK_TERSEMBUNYI]');

  // 4. Bank Account & Credit Card Redaction (must run before NIM regex to capture contextual account numbers)
  const BANK_ACCOUNT_REGEX = /\b(?:rekening|no\s*rek|rek|bca|mandiri|bri|bni|cimb|danamon|bank)(?:\s+[a-zA-Z]+)*\s*[:=]?\s*(\d{10,16})\b/gi;
  applyRedaction(BANK_ACCOUNT_REGEX, 'bank_account', 'rekening: [REKENING_TERSEMBUNYI]');

  const CREDIT_CARD_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g;
  applyRedaction(CREDIT_CARD_REGEX, 'credit_card', '[KARTU_KREDIT_TERSEMBUNYI]');

  // 5. NIM Redaction (8 to 14 digits or university format e.g. 21/123456/TK/12345)
  const NIM_REGEX = /\b(?:\d{8,14}|\d{2}\/\d{6}\/[A-Za-z]{2,4}\/\d{4,5})\b/g;
  applyRedaction(NIM_REGEX, 'nim', '[NIM_TERSEMBUNYI]');

  // 6. Detailed Address Redaction
  const ADDRESS_REGEX = /\b(?:Jl\.|Jalan|Gg\.|Gang|Komplek|RT\s*\d+|RW\s*\d+|Kec\.|Kab\.|Kel\.|Desa|Kota|Provinsi)\s+[A-Za-z0-9\s.-]+?\b(?=,|$|\s+password|\s+credential|\s+NIM|\s+NIK)/gi;
  applyRedaction(ADDRESS_REGEX, 'address', '[ALAMAT_TERSEMBUNYI]');

  // 7. Social Media Handles Redaction
  const SOCIAL_MEDIA_HANDLE_REGEX = /@(?!gamil|gmail|yahoo|hotmail|outlook)[a-zA-Z0-9_]{3,30}\b/g;
  applyRedaction(SOCIAL_MEDIA_HANDLE_REGEX, 'social_media', '[USERNAME_TERSEMBUNYI]');

  // 8. Name Introductions Redaction
  const NAME_INTRO_REGEX = /(?:[Nn]ama saya|[Nn]ama aku|[Nn]amaku|[Pps]anggil aku|[Pps]anggil gue|[Nn]ama gue)(?:\s+adalah)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  applyRedaction(NAME_INTRO_REGEX, 'name', (match: string) => {
    if (match.toLowerCase().includes('nama saya')) return 'nama saya [MAHASISWA]';
    if (match.toLowerCase().includes('namaku')) return 'namaku [MAHASISWA]';
    if (match.toLowerCase().includes('nama aku')) return 'nama aku [MAHASISWA]';
    if (match.toLowerCase().includes('nama gue')) return 'nama gue [MAHASISWA]';
    return 'panggil aku [MAHASISWA]';
  });

  // 9. Passwords, PINs, OTPs Redaction
  const SENSITIVE_AUTH_REGEX = /\b(?:password|kata\s*sandi|pin|otp)\s*[:=]\s*[^\s,;]+/gi;
  applyRedaction(SENSITIVE_AUTH_REGEX, 'auth_credential', 'credential=[REDACTED]');

  return {
    hasPii: detectedTypes.size > 0,
    sanitizedText: sanitized,
    detectedTypes: Array.from(detectedTypes)
  };
}

/**
 * Anonymize user profile for logs or AI prompts
 */
export function anonymizeUserProfile(user: { id?: string; name?: string; email?: string }) {
  return {
    id: user.id || 'anonymous',
    displayName: user.name ? user.name.charAt(0) + '***' : 'Mahasiswa',
    maskedEmail: user.email ? user.email.replace(/(.{2})(.*)(?=@)/, '$1***') : 'm***@kampus.ac.id'
  };
}
