// Infrastructure Adapter: NequiPdfParser
// Implements IPdfTransactionParser for Nequi PDF bank statements

import { IPdfTransactionParser } from '../../domain/ports/services/pdf-parser.port.js';
import { RawTransaction } from '../../domain/value-objects/raw-transaction.js';

// Matches: DD/MM/YYYY  description  $amount  $balance
const TX_REGEX = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+\$([-]?[\d,]+\.\d{2})\s+\$[\d,]+\.\d{2}$/;

// Lines to skip
const SKIP_PATTERNS = [
  /^Fecha del movimiento/i,
  /^Extracto de dep[oó]sito/i,
  /^N[uú]mero de dep[oó]sito/i,
  /^Estado de dep[oó]sito/i,
  /^Saldo anterior/i,
  /^Total abonos/i,
  /^Total cargos/i,
  /^Saldo actual/i,
  /^Saldo promedio/i,
  /^Valor de intereses/i,
  /^Retefuente/i,
  /^Cuentas por cobrar/i,
  /^Resumen/i,
  /^Los dep[oó]sitos de bajo monto/i,
  /^https?:\/\//i,
  /^--\s*\d+\s+of\s+\d+\s*--$/i,
  /^\s*$/,
];

export class NequiPdfParser implements IPdfTransactionParser {
  readonly bankName = 'Nequi';
  readonly allowDuplicates = true;

  detect(text: string): boolean {
    return text.includes('Extracto de depósito de bajo monto')
      || text.includes('Extracto de deposito de bajo monto');
  }

  parse(text: string): RawTransaction[] {
    const lines = text.split('\n');
    const transactions: RawTransaction[] = [];

    // Extract "Saldo Anterior" from the summary block before processing individual lines
    const saldoAnterior = this.extractSaldoAnterior(text, lines);
    if (saldoAnterior) transactions.push(saldoAnterior);

    for (const line of lines) {
      const trimmed = line.trim();

      if (this.shouldSkip(trimmed)) continue;

      const match = TX_REGEX.exec(trimmed);
      if (!match) continue;

      const [, dateRaw, description, amountRaw] = match;

      const amount = Math.abs(this.parseAmount(amountRaw!));
      if (amount === 0) continue;

      const type = amountRaw!.startsWith('-') ? 'debit' : 'credit';

      transactions.push({
        date: this.parseDate(dateRaw!),
        description: description!.trim(),
        amount,
        type,
      });
    }

    return transactions;
  }

  private shouldSkip(line: string): boolean {
    return SKIP_PATTERNS.some(p => p.test(line));
  }

  private extractPeriodStartDate(text: string): string {
    // "Estado de depósito de bajo monto para el período de: 2026/01/01 a 2026/01/31"
    const match = /per[ií]odo de:\s*(\d{4})\/(\d{2})\/(\d{2})/i.exec(text);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return new Date().toISOString().split('T')[0]!;
  }

  private extractSaldoAnterior(text: string, lines: string[]): RawTransaction | null {
    // Nequi PDF layout: standalone value lines appear BEFORE the label block.
    // e.g. "$23,144.57\n$1,218,502.03\nSaldo anterior\nTotal abonos\n..."
    // The saldo anterior is the topmost value immediately above the label block.
    const saldoIdx = lines.findIndex(l => /^Saldo anterior$/i.test(l.trim()));
    if (saldoIdx === -1) return null;

    const AMOUNT_RE = /^\$?([\d,]+\.\d{2})$/;

    // Walk backwards collecting consecutive standalone amount lines
    const amounts: number[] = [];
    for (let i = saldoIdx - 1; i >= Math.max(0, saldoIdx - 10); i--) {
      const line = lines[i]!.trim();
      if (!line) continue;
      const m = AMOUNT_RE.exec(line);
      if (m) {
        amounts.unshift(parseFloat(m[1]!.replace(/,/g, '')));
      } else {
        break;
      }
    }

    // The first (topmost) amount in the block is the saldo anterior
    if (amounts.length > 0 && amounts[0]! > 0) {
      return {
        date: this.extractPeriodStartDate(text),
        description: 'Saldo Anterior',
        amount: amounts[0]!,
        type: 'credit',
      };
    }
    return null;
  }

  private parseAmount(raw: string): number {
    // Format: -7,000.00 or 5,500.00
    return parseFloat(raw.replace(/,/g, ''));
  }

  private parseDate(raw: string): string {
    // DD/MM/YYYY → YYYY-MM-DD
    const [day, month, year] = raw.split('/');
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  }
}
