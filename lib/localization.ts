// lib/localization.ts - International localization utilities

export type SupportedLanguage = 'en' | 'es' | 'pt' | 'fr';
export type SupportedCurrency = 'USD' | 'MXN' | 'BRL' | 'ARS' | 'COP' | 'EUR' | 'GBP';

export interface LocaleConfig {
  language: SupportedLanguage;
  currency: SupportedCurrency;
  country: string;
  countryName: string;
  priceMultiplier: number; // PPP adjustment multiplier
}

// Purchasing Power Parity adjustments for fair pricing
// Based on Big Mac Index and GDP per capita
const PPP_MULTIPLIERS: Record<string, number> = {
  US: 1.0,    // Baseline
  MX: 0.45,   // Mexico - 45% of US purchasing power
  BR: 0.40,   // Brazil - 40%
  AR: 0.25,   // Argentina - 25% (economic challenges)
  CO: 0.35,   // Colombia - 35%
  ES: 0.85,   // Spain - 85%
  GB: 1.05,   // UK - 105%
  FR: 0.90,   // France - 90%
  DE: 0.90,   // Germany - 90%
  CA: 0.85,   // Canada - 85%
};

// Currency symbols and formatting
const CURRENCY_CONFIG: Record<SupportedCurrency, {
  symbol: string;
  code: string;
  decimals: number;
  position: 'before' | 'after';
}> = {
  USD: { symbol: '$', code: 'USD', decimals: 2, position: 'before' },
  MXN: { symbol: '$', code: 'MXN', decimals: 2, position: 'before' },
  BRL: { symbol: 'R$', code: 'BRL', decimals: 2, position: 'before' },
  ARS: { symbol: '$', code: 'ARS', decimals: 2, position: 'before' },
  COP: { symbol: '$', code: 'COP', decimals: 0, position: 'before' },
  EUR: { symbol: '€', code: 'EUR', decimals: 2, position: 'before' },
  GBP: { symbol: '£', code: 'GBP', decimals: 2, position: 'before' },
};

// Map country codes to locale configurations
const COUNTRY_LOCALE_MAP: Record<string, LocaleConfig> = {
  US: { language: 'en', currency: 'USD', country: 'US', countryName: 'United States', priceMultiplier: 1.0 },
  MX: { language: 'es', currency: 'MXN', country: 'MX', countryName: 'Mexico', priceMultiplier: 0.45 },
  BR: { language: 'pt', currency: 'BRL', country: 'BR', countryName: 'Brazil', priceMultiplier: 0.40 },
  AR: { language: 'es', currency: 'ARS', country: 'AR', countryName: 'Argentina', priceMultiplier: 0.25 },
  CO: { language: 'es', currency: 'COP', country: 'CO', countryName: 'Colombia', priceMultiplier: 0.35 },
  ES: { language: 'es', currency: 'EUR', country: 'ES', countryName: 'Spain', priceMultiplier: 0.85 },
  GB: { language: 'en', currency: 'GBP', country: 'GB', countryName: 'United Kingdom', priceMultiplier: 1.05 },
  FR: { language: 'fr', currency: 'EUR', country: 'FR', countryName: 'France', priceMultiplier: 0.90 },
  DE: { language: 'en', currency: 'EUR', country: 'DE', countryName: 'Germany', priceMultiplier: 0.90 },
  CA: { language: 'en', currency: 'USD', country: 'CA', countryName: 'Canada', priceMultiplier: 0.85 },
};

/**
 * Detect user's country from IP using Vercel's geo headers
 */
export function detectCountryFromHeaders(headers: Headers): string {
  // Vercel provides geo data in headers
  const country = headers.get('x-vercel-ip-country') ||
                  headers.get('cf-ipcountry') ||  // Cloudflare
                  'US'; // Default to US

  return country.toUpperCase();
}

/**
 * Detect user's language from browser
 */
export function detectLanguageFromBrowser(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language.split('-')[0].toLowerCase();

  switch (browserLang) {
    case 'es': return 'es';
    case 'pt': return 'pt';
    case 'fr': return 'fr';
    default: return 'en';
  }
}

/**
 * Get locale configuration for a country
 */
export function getLocaleForCountry(countryCode: string): LocaleConfig {
  return COUNTRY_LOCALE_MAP[countryCode] || COUNTRY_LOCALE_MAP['US'];
}

/**
 * Convert USD price to local currency with PPP adjustment
 */
export function convertPrice(
  priceUSD: number,
  targetCurrency: SupportedCurrency,
  countryCode: string
): {
  amount: number;
  currency: SupportedCurrency;
  formatted: string;
} {
  const pppMultiplier = PPP_MULTIPLIERS[countryCode] || 1.0;
  const config = CURRENCY_CONFIG[targetCurrency];

  // Apply PPP adjustment
  const adjustedPriceUSD = priceUSD * pppMultiplier;

  // Convert to target currency (using rough exchange rates)
  let convertedAmount: number;
  switch (targetCurrency) {
    case 'MXN':
      convertedAmount = adjustedPriceUSD * 17; // 1 USD ≈ 17 MXN
      break;
    case 'BRL':
      convertedAmount = adjustedPriceUSD * 5; // 1 USD ≈ 5 BRL
      break;
    case 'ARS':
      convertedAmount = adjustedPriceUSD * 350; // 1 USD ≈ 350 ARS
      break;
    case 'COP':
      convertedAmount = adjustedPriceUSD * 4000; // 1 USD ≈ 4000 COP
      break;
    case 'EUR':
      convertedAmount = adjustedPriceUSD * 0.92; // 1 USD ≈ 0.92 EUR
      break;
    case 'GBP':
      convertedAmount = adjustedPriceUSD * 0.79; // 1 USD ≈ 0.79 GBP
      break;
    case 'USD':
    default:
      convertedAmount = adjustedPriceUSD;
  }

  // Round to appropriate decimals
  const rounded = Number(convertedAmount.toFixed(config.decimals));

  // Format with currency symbol
  const formatted = config.position === 'before'
    ? `${config.symbol}${rounded.toLocaleString()}`
    : `${rounded.toLocaleString()}${config.symbol}`;

  return {
    amount: rounded,
    currency: targetCurrency,
    formatted,
  };
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency
): string {
  const config = CURRENCY_CONFIG[currency];
  const rounded = Number(amount.toFixed(config.decimals));

  return config.position === 'before'
    ? `${config.symbol}${rounded.toLocaleString()}`
    : `${rounded.toLocaleString()}${config.symbol}`;
}

/**
 * Get currency info
 */
export function getCurrencyInfo(currency: SupportedCurrency) {
  return CURRENCY_CONFIG[currency];
}

/**
 * Store user's locale preference
 */
export function storeLocalePreference(locale: LocaleConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('userLocale', JSON.stringify(locale));
}

/**
 * Get stored locale preference
 */
export function getStoredLocalePreference(): LocaleConfig | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('userLocale');
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Get user's locale (stored preference or auto-detected)
 */
export async function getUserLocale(): Promise<LocaleConfig> {
  // Check stored preference first
  const stored = getStoredLocalePreference();
  if (stored) return stored;

  // Auto-detect from IP (client-side we'll use an API)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/geo');
      if (res.ok) {
        const data = await res.json();
        return getLocaleForCountry(data.country);
      }
    } catch (error) {
      console.error('Failed to detect geo location:', error);
    }
  }

  // Fallback: detect from browser language
  const language = detectLanguageFromBrowser();
  const defaultCountry = language === 'es' ? 'MX' : 'US';

  return getLocaleForCountry(defaultCountry);
}
