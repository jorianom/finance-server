// Domain Service: Transaction Hasher
// Generates a deterministic hash for deduplication
// Uses Node.js crypto (stdlib — not a framework dependency)

import { createHash } from 'node:crypto';

export interface HashableTransaction {
  date: string;
  description: string;
  amount: number;
  type: string;
}

export function hashTransaction(tx: HashableTransaction, index?: number): string {
  const suffix = index !== undefined ? `|${index}` : '';
  const payload = `${tx.date}|${tx.description}|${tx.amount}|${tx.type}${suffix}`;
  return createHash('sha256').update(payload).digest('hex');
}
