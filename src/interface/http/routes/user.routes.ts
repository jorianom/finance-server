// Interface: User Routes
// GET /users/settings — Get user preferences
// PATCH /users/settings — Update user preferences

import { FastifyInstance } from 'fastify';
import { GetUserSettingsUseCase } from '../../../application/use-cases/get-user-settings.use-case.js';
import { UpdateUserSettingsUseCase } from '../../../application/use-cases/update-user-settings.use-case.js';
import {
  userSettingsResponseSchema,
  updateUserSettingsBodySchema,
} from '../schemas/user.schema.js';

const USER_ID = 1; // MVP: hardcoded user

export interface UserRoutesOptions {
  getUserSettingsUseCase: GetUserSettingsUseCase;
  updateUserSettingsUseCase: UpdateUserSettingsUseCase;
}

export async function userRoutes(
  fastify: FastifyInstance,
  opts: UserRoutesOptions,
) {
  const { getUserSettingsUseCase, updateUserSettingsUseCase } = opts;

  fastify.get('/settings', {
    schema: { response: { 200: userSettingsResponseSchema } },
  }, async (_request, reply) => {
    const result = await getUserSettingsUseCase.execute(USER_ID);
    return reply.send(result);
  });

  fastify.patch('/settings', {
    schema: { body: updateUserSettingsBodySchema },
  }, async (request, reply) => {
    const body = request.body as { cycleStartDay: number };
    const result = await updateUserSettingsUseCase.execute(USER_ID, body.cycleStartDay);
    return reply.send(result);
  });
}
