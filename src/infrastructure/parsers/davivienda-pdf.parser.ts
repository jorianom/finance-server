// Infrastructure Adapter: DaviviendaPdfParser
// Implements IPdfTransactionParser for Davivienda PDF bank statements

import { IPdfTransactionParser } from '../../domain/ports/services/pdf-parser.port.js';
import { RawTransaction } from '../../domain/value-objects/raw-transaction.js';

// Matches: DD MM $ amount+/- doc description
const TX_REGEX = /^(\d{2})\s+(\d{2})\s+\$\s+([\d,]+\.\d{2})([+-])\s+\d{4}\s+(.+)$/;

// Extract month name and year from header: "INFORME DEL MES: MARZO /2026"
const HEADER_REGEX = /INFORME DEL MES:\s*(\w+)\s*\/\s*(\d{4})/i;

const ES_MONTH_MAP: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

// Lines to skip
const SKIP_PATTERNS = [
  /^Este producto cuenta con/i,
  /^Cualquier diferencia/i,
  /^Recuerde que/i,
  /^Para mayor informaci[oó]n/i,
  /^H\.\d+/,
  /^CUENTA DE AHORROS/i,
  /^\d{4}\s+\d{4}\s+\d{4}$/,
  /^INFORME DEL MES/i,
  /^Banco Davivienda/i,
  /^Apreciado Cliente/i,
  /^Saldo Anterior/i,
  /^M[aá]s Cr[eé]ditos/i,
  /^Menos D[eé]bitos/i,
  /^Nuevo Saldo/i,
  /^Saldo Promedio/i,
  /^Saldo Total/i,
  /^EXTRACTO CUENTA/i,
  /^Fecha\s+Valor\s+Doc/i,
  /^\?\?/,
  /^--\s*\d+\s+of\s+\d+\s*--$/i,
  /^\s*$/,
  /^[A-Z\s]+@[A-Z\s]+\.[A-Z]+$/i,
];

export class DaviviendaPdfParser implements IPdfTransactionParser {
  readonly bankName = 'Davivienda';

  detect(text: string): boolean {
    return text.includes('Banco Davivienda')
      || text.includes('EXTRACTO CUENTA DE AHORROS');
  }

  parse(text: string): RawTransaction[] {
    const year = this.extractYear(text);
    const lines = text.split('\n');
    const transactions: RawTransaction[] = [];

    // Extract "Saldo Anterior" from the header summary block (same line: "Saldo Anterior $417.17")
    const saldoAnterior = this.extractSaldoAnterior(text);
    if (saldoAnterior) transactions.push(saldoAnterior);

    for (const line of lines) {
      const trimmed = line.trim();

      if (this.shouldSkip(trimmed)) continue;

      const match = TX_REGEX.exec(trimmed);
      if (!match) continue;

      const [, day, month, amountRaw, sign, description] = match;

      const amount = this.parseAmount(amountRaw!);
      if (amount === 0) continue;

      const type: 'debit' | 'credit' = sign === '+' ? 'credit' : 'debit';

      transactions.push({
        date: `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`,
        description: description!.trim(),
        amount,
        type,
      });
    }

    return transactions;
  }

  private extractYear(text: string): string {
    const match = HEADER_REGEX.exec(text);
    if (match) return match[2]!;
    return new Date().getFullYear().toString();
  }

  private extractPeriodStart(text: string): string {
    const match = HEADER_REGEX.exec(text);
    if (match) {
      const month = ES_MONTH_MAP[match[1]!.toLowerCase()] ?? '01';
      return `${match[2]!}-${month}-01`;
    }
    return new Date().toISOString().split('T')[0]!;
  }

  private extractSaldoAnterior(text: string): RawTransaction | null {
    // Davivienda format: "Saldo Anterior $417.17" — amount on same line
    const match = /^Saldo Anterior\s+\$([\d,]+\.\d{2})/im.exec(text);
    if (!match) return null;
    const amount = this.parseAmount(match[1]!);
    if (amount === 0) return null;
    return {
      date: this.extractPeriodStart(text),
      description: 'Saldo Anterior',
      amount,
      type: 'credit',
    };
  }

  private shouldSkip(line: string): boolean {
    return SKIP_PATTERNS.some(p => p.test(line));
  }

  private parseAmount(raw: string): number {
    // Format: 3,778,514.00
    return parseFloat(raw.replace(/,/g, ''));
  }
}
