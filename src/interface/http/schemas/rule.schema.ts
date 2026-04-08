// JSON Schema: Rule validation

export const createRuleBodySchema = {
  type: 'object' as const,
  properties: {
    keyword: { type: 'string', minLength: 1 },
    category_id: { type: 'number' },
    merchant_name: { type: 'string' },
    priority: { type: 'number', default: 0 },
  },
  required: ['keyword', 'category_id', 'priority'] as const,
};
