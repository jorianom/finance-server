// JSON Schema: Transaction validation

export const transactionQuerySchema = {
  type: 'object' as const,
  properties: {
    page: { type: 'number', default: 1 },
    limit: { type: 'number', default: 20 },
    category_id: { type: 'number' },
    account_id: { type: 'number' },
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
    cycle: { type: 'string', format: 'date' },
  },
};

export const summaryQuerySchema = {
  type: 'object' as const,
  properties: {
    account_id: { type: 'number' },
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
    cycle: { type: 'string', format: 'date' },
  },
};
