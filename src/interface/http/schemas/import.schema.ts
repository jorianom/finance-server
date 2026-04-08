// JSON Schema: Import validation

export const importBodySchema = {
  type: 'object' as const,
  properties: {
    account_id: { type: 'number' },
  },
  required: ['account_id'],
};

export const importResponseSchema = {
  type: 'object' as const,
  properties: {
    importId: { type: 'number' },
    result: {
      type: 'object' as const,
      properties: {
        total: { type: 'number' },
        created: { type: 'number' },
        duplicates: { type: 'number' },
        errors: { type: 'number' },
      },
    },
  },
};
