/**
 * Universal Country Flag and Locale Detection Utilities
 * Generates ISO-3166-1 alpha-2 Unicode Flag Emojis for all 250+ countries.
 */

export function getCountryFlag(countryCode?: string | null): string {
  if (!countryCode || typeof countryCode !== 'string') return '🌍';
  const clean = countryCode.trim().toUpperCase();
  if (clean.length !== 2) return '🌍';
  
  const first = clean.charCodeAt(0) - 65 + 0x1F1E6;
  const second = clean.charCodeAt(1) - 65 + 0x1F1E6;
  
  if (first < 0x1F1E6 || first > 0x1F1FF || second < 0x1F1E6 || second > 0x1F1FF) {
    return '🌍';
  }
  
  try {
    return String.fromCodePoint(first, second);
  } catch {
    return '🌍';
  }
}

export function detectBrowserCountry(): string {
  try {
    if (typeof navigator !== 'undefined') {
      const languages = navigator.languages || [navigator.language];
      for (const lang of languages) {
        if (!lang) continue;
        const parts = lang.split(/[-_]/);
        if (parts.length > 1) {
          const region = parts[parts.length - 1].toUpperCase();
          if (region.length === 2 && /^[A-Z]{2}$/.test(region)) {
            return region;
          }
        }
      }
    }
  } catch {}
  return 'NG'; // Default fallback
}

