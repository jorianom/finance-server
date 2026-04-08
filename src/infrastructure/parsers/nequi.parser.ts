// Infrastructure Adapter: NequiParser
// Implements ITransactionParser for Nequi CSV extracts

import { parse } from 'csv-parse/sync';
import { ITransactionParser } from '../../domain/ports/services/parser.port.js';
import { RawTransaction } from '../../domain/value-objects/raw-transaction.js';

const REQUIRED_HEADERS = ['fecha movimiento', 'detalle', 'monto'];
const ALT_HEADERS = ['fecha', 'detalle', 'valor'];

export class NequiParser implements ITransactionParser {
  readonly bankName = 'Nequi';
  readonly allowDuplicates = true;

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
      const dateRaw = this.findColumn(row, ['fecha movimiento', 'fecha']);
      const description = this.findColumn(row, ['detalle', 'descripción', 'descripcion']);
      const montoRaw = this.findColumn(row, ['monto', 'valor']);
      const tipoRaw = this.findColumn(row, ['tipo']);

      const amount = Math.abs(this.parseAmount(montoRaw));
      const type = this.resolveType(tipoRaw, montoRaw);

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
    const cleaned = raw.replace(/\$/g, '').trim();
    if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }

  private parseDate(raw: string): string {
    const parts = raw.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
    }
    return raw;
  }

  private resolveType(tipo: string, monto: string): 'debit' | 'credit' {
    const t = tipo.toLowerCase().trim();
    if (t.includes('envío') || t.includes('envio') || t.includes('pago') || t.includes('compra')) return 'debit';
    if (t.includes('recibido') || t.includes('recarga') || t.includes('ingreso')) return 'credit';
    const num = this.parseAmount(monto);
    return num < 0 ? 'debit' : 'credit';
  }
}
