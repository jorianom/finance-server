// Domain Service: Transaction Classifier
// Matches a description against rules sorted by priority

import { Rule } from '../entities/rule.entity.js';

export interface ClassificationResult {
  categoryId: number | null;
  merchant: string | null;
  autoClassified: boolean;
}

export function classify(description: string, rules: Rule[]): ClassificationResult {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (rule.matches(description)) {
      return {
        categoryId: rule.categoryId,
        merchant: rule.merchantName,
        autoClassified: false,
      };
    }
  }

  return { categoryId: null, merchant: null, autoClassified: true };
}
