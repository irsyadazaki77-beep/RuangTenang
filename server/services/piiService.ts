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

  // Define regexes without global state bugs
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const ID_PHONE_REGEX = /(?:\+62|62|08)[1-9]\d{7,11}\b/g;
  const NIK_REGEX = /\b[1-9]\d{15}\b/g; // 16-digit Indonesian NIK
  const NIM_REGEX = /\b\d{8,14}\b/g; // 8 to 14 digit Student ID
  const ADDRESS_REGEX = /\b(?:Jl\.|Jalan|Gg\.|Gang|Komplek|RT\s*\d+|RW\s*\d+|Kec\.|Kab\.)\s+[A-Za-z0-9\s.,-]+/gi;
  const SOCIAL_MEDIA_HANDLE_REGEX = /@(?!gamil|gmail|yahoo|hotmail|outlook)[a-zA-Z0-9_]{3,30}\b/g;
  const NAME_INTRO_REGEX = /(?:[Nn]ama saya|[Nn]ama aku)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;

  let sanitized = input;
  const detectedTypes: Set<string> = new Set();

  // 1. Email Redaction
  if (EMAIL_REGEX.test(sanitized)) {
    detectedTypes.add('email');
    sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_TERSEMBUNYI]');
  }

  // 2. Indonesian Phone Redaction
  if (ID_PHONE_REGEX.test(sanitized)) {
    detectedTypes.add('phone');
    sanitized = sanitized.replace(ID_PHONE_REGEX, '[NOMOR_HP_TERSEMBUNYI]');
  }

  // 3. NIK Redaction (16 digits)
  if (NIK_REGEX.test(sanitized)) {
    detectedTypes.add('nik');
    sanitized = sanitized.replace(NIK_REGEX, '[NIK_TERSEMBUNYI]');
  }

  // 3b. NIM Redaction (8-14 digits)
  if (NIM_REGEX.test(sanitized)) {
    detectedTypes.add('nim');
    sanitized = sanitized.replace(NIM_REGEX, '[NIM_TERSEMBUNYI]');
  }

  // 4. Detailed Address Redaction
  if (ADDRESS_REGEX.test(sanitized)) {
    detectedTypes.add('address');
    sanitized = sanitized.replace(ADDRESS_REGEX, '[ALAMAT_TERSEMBUNYI]');
  }

  // 5. Social Media Handles Redaction
  if (SOCIAL_MEDIA_HANDLE_REGEX.test(sanitized)) {
    detectedTypes.add('social_media');
    sanitized = sanitized.replace(SOCIAL_MEDIA_HANDLE_REGEX, '[USERNAME_TERSEMBUNYI]');
  }

  // 6. Name Redaction
  if (NAME_INTRO_REGEX.test(sanitized)) {
    detectedTypes.add('name');
    sanitized = sanitized.replace(NAME_INTRO_REGEX, 'nama saya [MAHASISWA]');
  }

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
