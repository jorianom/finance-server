// JSON Schema: Debt validation

export const createDebtBodySchema = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', minLength: 1 },
    entity: { type: 'string', minLength: 1 },
    initial_balance: { type: 'number', exclusiveMinimum: 0 },
    monthly_rate: { type: 'number', minimum: 0 },
    min_payment: { type: 'number', exclusiveMinimum: 0 },
    start_date: { type: 'string', format: 'date' },
    linked_description: { type: 'string' },
  },
  required: ['name', 'entity', 'initial_balance', 'monthly_rate', 'min_payment', 'start_date'] as const,
};

export const updateDebtBodySchema = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', minLength: 1 },
    entity: { type: 'string', minLength: 1 },
    current_balance: { type: 'number', minimum: 0 },
    monthly_rate: { type: 'number', minimum: 0 },
    min_payment: { type: 'number', exclusiveMinimum: 0 },
    linked_description: { type: ['string', 'null'] },
    status: { type: 'string', enum: ['active', 'paid_off'] },
  },
};

export const recordPaymentBodySchema = {
  type: 'object' as const,
  properties: {
    cycle_start: { type: 'string', format: 'date' },
    actual_amount: { type: 'number', exclusiveMinimum: 0 },
  },
  required: ['cycle_start', 'actual_amount'] as const,
};

export const updatePaymentBodySchema = {
  type: 'object' as const,
  properties: {
    actual_amount: { type: 'number', exclusiveMinimum: 0 },
  },
  required: ['actual_amount'] as const,
};
