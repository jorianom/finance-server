// Interface: Rule Routes
// GET /rules — List all rules
// POST /rules — Create a classification rule
// PUT /rules/:id — Update a classification rule
// DELETE /rules/:id — Delete a classification rule

import { FastifyInstance } from 'fastify';
import { GetRulesUseCase } from '../../../application/use-cases/get-rules.use-case.js';
import { CreateRuleUseCase } from '../../../application/use-cases/create-rule.use-case.js';
import { UpdateRuleUseCase } from '../../../application/use-cases/update-rule.use-case.js';
import { createRuleBodySchema } from '../schemas/rule.schema.js';
import { PrismaClient } from '../../../generated/prisma/client.js';

const USER_ID = 1; // MVP: hardcoded user

export interface RuleRoutesOptions {
  getRulesUseCase: GetRulesUseCase;
  createRuleUseCase: CreateRuleUseCase;
  updateRuleUseCase: UpdateRuleUseCase;
  prisma: PrismaClient;
}

export async function ruleRoutes(
  fastify: FastifyInstance,
  opts: RuleRoutesOptions,
) {
  const { getRulesUseCase, createRuleUseCase, updateRuleUseCase, prisma } = opts;

  fastify.get('/', async (_request, reply) => {
    const rules = await getRulesUseCase.execute(USER_ID);
    return reply.send({ data: rules });
  });

  fastify.post('/', {
    schema: { body: createRuleBodySchema },
  }, async (request, reply) => {
    const body = request.body as {
      keyword: string;
      category_id: number;
      merchant_name?: string;
      priority: number;
    };

    const rule = await createRuleUseCase.execute({
      userId: USER_ID,
      keyword: body.keyword,
      categoryId: body.category_id,
      merchantName: body.merchant_name,
      priority: body.priority,
    });

    return reply.status(201).send(rule);
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      keyword?: string;
      category_id?: number;
      merchant_name?: string | null;
      priority?: number;
    };

    const rule = await updateRuleUseCase.execute(Number(id), USER_ID, {
      keyword: body.keyword,
      categoryId: body.category_id,
      merchantName: body.merchant_name,
      priority: body.priority,
    });

    return reply.send(rule);
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.rules.delete({
      where: { id: BigInt(id) },
    });
    return reply.status(204).send();
  });
}
