// JSON Schema: User settings validation

export const userSettingsResponseSchema = {
  type: 'object' as const,
  properties: {
    cycleStartDay: { type: 'number' },
  },
  required: ['cycleStartDay'],
};

export const updateUserSettingsBodySchema = {
  type: 'object' as const,
  properties: {
    cycleStartDay: { type: 'integer', minimum: 1, maximum: 28 },
  },
  required: ['cycleStartDay'],
};
