/**
 * Client-Side PII Detection & Sanitization Utility
 */

export interface ClientPiiResult {
  hasPii: boolean;
  sanitizedText: string;
  detectedTypes: string[];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+62|62|08)[2-9]\d{7,11}\b/g;
const NIK_REGEX = /\b[1-9]\d{15}\b/g;

export function detectClientPII(text: string): ClientPiiResult {
  if (!text) return { hasPii: false, sanitizedText: '', detectedTypes: [] };

  const detected: string[] = [];
  let sanitized = text;

  if (EMAIL_REGEX.test(text)) {
    detected.push('Email');
    sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_TERSEMBUNYI]');
  }
  if (PHONE_REGEX.test(text)) {
    detected.push('Nomor HP');
    sanitized = sanitized.replace(PHONE_REGEX, '[NOMOR_HP_TERSEMBUNYI]');
  }
  if (NIK_REGEX.test(text)) {
    detected.push('NIK/KTP');
    sanitized = sanitized.replace(NIK_REGEX, '[NIK_TERSEMBUNYI]');
  }

  return {
    hasPii: detected.length > 0,
    sanitizedText: sanitized,
    detectedTypes: detected
  };
}
