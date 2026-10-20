/**
 * Utility for safe URL validation and sanitization.
 * Prevents Stored XSS via javascript: or data: pseudo-protocols and invalid URL schemes.
 */
export function getSafeExternalUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}
