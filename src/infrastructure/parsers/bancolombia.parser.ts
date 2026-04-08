// Infrastructure Adapter: BancolombiaParser
// Implements ITransactionParser for Bancolombia CSV extracts

import { parse } from 'csv-parse/sync';
import { ITransactionParser } from '../../domain/ports/services/parser.port.js';
import { RawTransaction } from '../../domain/value-objects/raw-transaction.js';

// Expected Bancolombia CSV headers (case-insensitive match)
const REQUIRED_HEADERS = ['fecha', 'descripción', 'valor'];
const ALT_HEADERS = ['fecha', 'descripcion', 'valor'];

export class BancolombiaParser implements ITransactionParser {
  readonly bankName = 'Bancolombia';

  detect(headers: string[]): boolean {
    const normalized = headers.map(h => h.toLowerCase().trim());
    return (
      REQUIRED_HEADERS.every(h => normalized.includes(h)) ||
      ALT_HEADERS.every(h => normalized.includes(h))
    );
  }

  parse(content: string): RawTransaction[] {
    const records: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    return records.map(row => {
      const dateRaw = this.findColumn(row, ['fecha']);
      const description = this.findColumn(row, ['descripción', 'descripcion']);
      const valorRaw = this.findColumn(row, ['valor']);
      const tipoRaw = this.findColumn(row, ['tipo']);

      const amount = Math.abs(this.parseAmount(valorRaw));
      const type = this.resolveType(tipoRaw, valorRaw);

      return {
        date: this.parseDate(dateRaw),
        description,
        amount,
        type,
      };
    });
  }

  private findColumn(row: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
      for (const [col, val] of Object.entries(row)) {
        if (col.toLowerCase().trim() === key) return val;
      }
    }
    return '';
  }

  private parseAmount(raw: string): number {
    // Handle Colombian number format: 1.234.567,89 or 1234567.89
    const cleaned = raw.replace(/\$/g, '').trim();
    // If comma is used as decimal separator
    if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }

  private parseDate(raw: string): string {
    // Handles DD/MM/YYYY or YYYY-MM-DD
    const parts = raw.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
    }
    return raw; // Already in YYYY-MM-DD
  }

  private resolveType(tipo: string, valor: string): 'debit' | 'credit' {
    const t = tipo.toLowerCase().trim();
    if (t.includes('débito') || t.includes('debito') || t.includes('retiro')) return 'debit';
    if (t.includes('crédito') || t.includes('credito') || t.includes('abono')) return 'credit';
    // Fallback: negative value = debit
    const num = this.parseAmount(valor);
    return num < 0 ? 'debit' : 'credit';
  }
}
