// Domain Service: Text Normalizer
// Pure function — no external dependencies

export function normalizeDescription(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .replace(/[^\w\s.,\-\/áéíóúñü]/gi, '') // remove special chars, keep accents
    .trim();
}
