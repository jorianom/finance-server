// Domain Service: Merchant Extractor
// Maps known patterns in descriptions to merchant names

const MERCHANT_PATTERNS: Array<{ pattern: RegExp; merchant: string }> = [
  { pattern: /netflix/i, merchant: 'Netflix' },
  { pattern: /spotify/i, merchant: 'Spotify' },
  { pattern: /rappi/i, merchant: 'Rappi' },
  { pattern: /uber\s?eats/i, merchant: 'Uber Eats' },
  { pattern: /uber(?!\s?eats)/i, merchant: 'Uber' },
  { pattern: /amazon/i, merchant: 'Amazon' },
  { pattern: /mercado\s?libre/i, merchant: 'Mercado Libre' },
  { pattern: /nequi/i, merchant: 'Nequi' },
  { pattern: /daviplata/i, merchant: 'Daviplata' },
  { pattern: /youtube/i, merchant: 'YouTube' },
  { pattern: /apple/i, merchant: 'Apple' },
  { pattern: /google/i, merchant: 'Google' },
  { pattern: /ifood|i\s?food/i, merchant: 'iFood' },
  { pattern: /exito|éxito/i, merchant: 'Éxito' },
  { pattern: /falabella/i, merchant: 'Falabella' },
];

export function extractMerchant(description: string): string | null {
  for (const { pattern, merchant } of MERCHANT_PATTERNS) {
    if (pattern.test(description)) {
      return merchant;
    }
  }
  return null;
}
