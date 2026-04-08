// Infrastructure Adapter: RappiPayPdfParser
// Implements IPdfTransactionParser for RappiPay/RappiCuenta PDF bank statements
//
// Transaction line format: "DD MMM YYYY     Description     [+-]$amount.00"
// Example: "02 Mar 2026     Compra con tarjeta      -$24,900.00"

import { IPdfTransactionParser } from '../../domain/ports/services/pdf-parser.port.js';
import { RawTransaction } from '../../domain/value-objects/raw-transaction.js';

// Matches: DD MMM YYYY \t Description \t [+-]$amount
// Fields are separated by space+tab: "02 Mar 2026 \tCompra con tarjeta \t-$24,900.00"
const TX_REGEX = /^(\d{2} \w{2,4} \d{4}) \t(.+?) \t([+-]\$[\d,]+\.\d{2})$/;

const MONTH_MAP: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04',
  may: '05', jun: '06', jul: '07', ago: '08',
  sep: '09', oct: '10', nov: '11', dic: '12',
};

const SKIP_PATTERNS: RegExp[] = [
  /^Periodo$/i,
  /^\d+ [A-Z]{3} - \d+ [A-Z]{3}/i,
  /^Tipo de cuenta/i,
  /^RappiCuenta/i,
  /^Extracto de (cuenta|tu)/i,
  /^N[uú]mero de cuenta/i,
  /^\d{6,12}$/,
  /^Correo:/i,
  /^Saldo (al final|anterior|final|promedio)/i,
  /^Abonos/i,
  /^Intereses ganados\s+[+-]/i,
  /^Retiros\s+/i,
  /^Comisiones/i,
  /^GMF 4x1000/i,
  /^Retenci[oó]n en la fuente/i,
  /^Iva/i,
  /^Resumen del periodo/i,
  /^Detalles de movimientos/i,
  /^Fecha\s+Descripci[oó]n/i,
  /^Los intereses son calculados/i,
  /^En caso de inconformidad/i,
  /^Revisor[íi]a fiscal/i,
  /^Defensor del Consumidor/i,
  /^P[áa]gina web/i,
  /^Chat en el App/i,
  /^RappiPay Compa[ñn][íi]a/i,
  /^Torre Oval/i,
  /^\$[\d,]+\.\d{2}$/,
  /^--\s*\d+\s+of\s+\d+\s*--$/i,
  /^\s*$/,
];

export class RappiPayPdfParser implements IPdfTransactionParser {
  readonly bankName = 'RappiPay';
  readonly allowDuplicates = true;

  detect(text: string): boolean {
    return (
      text.includes('Extracto de tu RappiCuenta') ||
      text.includes('RappiPay Compañía de Financiamiento') ||
      text.includes('RappiCuenta - Cuenta de ahorros')
    );
  }

  parse(text: string): RawTransaction[] {
    const lines = text.split('\n');
    const transactions: RawTransaction[] = [];

    // Extract "Saldo Anterior" from the summary section before processing individual lines
    const saldoAnterior = this.extractSaldoAnterior(text);
    if (saldoAnterior) transactions.push(saldoAnterior);

    for (const line of lines) {
      const trimmed = line.trim();

      if (this.shouldSkip(trimmed)) continue;

      const match = TX_REGEX.exec(trimmed);
      if (!match) continue;

      const [, dateRaw, description, amountRaw] = match;

      const rawNum = parseFloat(amountRaw!.replace(/[$,]/g, ''));
      const amount = Math.abs(rawNum);
      if (amount === 0) continue;

      const type: 'debit' | 'credit' = rawNum < 0 ? 'debit' : 'credit';

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
    // Period line: "1 MAR - 31 MAR (31 días)"
    const periodMatch = /^(\d+)\s+([A-Za-z]{3})\s*-/im.exec(text);
    // Year from: "Extracto de cuenta generado el DD de MONTH de YYYY"
    const yearMatch = /generado el \d+ de \w+ de (\d{4})/i.exec(text);
    const year = yearMatch?.[1] ?? new Date().getFullYear().toString();
    if (periodMatch) {
      const day = periodMatch[1]!.padStart(2, '0');
      const month = MONTH_MAP[periodMatch[2]!.toLowerCase()] ?? '01';
      return `${year}-${month}-${day}`;
    }
    return `${year}-01-01`;
  }

  private extractSaldoAnterior(text: string): RawTransaction | null {
    // RappiPay format: "Saldo anterior \t$972,541.28" (tab-separated, same line)
    const match = /^Saldo anterior\s+\$([\d,]+\.\d{2})/im.exec(text);
    if (!match) return null;
    const amount = parseFloat(match[1]!.replace(/,/g, ''));
    if (amount === 0) return null;
    return {
      date: this.extractPeriodStartDate(text),
      description: 'Saldo Anterior',
      amount,
      type: 'credit',
    };
  }

  private parseDate(raw: string): string {
    // "02 Mar 2026" → "2026-03-02"
    const parts = raw.split(' ');
    const day = parts[0]!.padStart(2, '0');
    const month = MONTH_MAP[parts[1]!.toLowerCase()] ?? '01';
    const year = parts[2]!;
    return `${year}-${month}-${day}`;
  }
}
