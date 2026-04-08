// JSON Schema: Budget validation

export const createBudgetItemBodySchema = {
  type: 'object' as const,
  properties: {
    cycle_start: { type: 'string', format: 'date' },
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['ingreso', 'gasto'] },
    amount: { type: 'number', minimum: 0 },
    is_fixed: { type: 'boolean' },
    category_id: { type: ['number', 'null'] },
    linked_description: { type: ['string', 'null'] },
  },
  required: ['cycle_start', 'name', 'type', 'amount'] as const,
};

export const updateBudgetItemBodySchema = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['ingreso', 'gasto'] },
    amount: { type: 'number', minimum: 0 },
    is_fixed: { type: 'boolean' },
    category_id: { type: ['number', 'null'] },
    linked_description: { type: ['string', 'null'] },
  },
};

export const confirmSuggestionsBodySchema = {
  type: 'object' as const,
  properties: {
    cycle_start: { type: 'string', format: 'date' },
    items: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['ingreso', 'gasto'] },
          amount: { type: 'number', minimum: 0 },
          is_fixed: { type: 'boolean' },
          category_id: { type: ['number', 'null'] },
          linked_description: { type: ['string', 'null'] },
        },
        required: ['name', 'type', 'amount'] as const,
      },
    },
  },
  required: ['cycle_start', 'items'] as const,
};
