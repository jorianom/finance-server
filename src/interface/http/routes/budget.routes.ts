// Interface: Budget Routes
// CRUD for budget items with cycle-based querying and copy-from-previous

import { FastifyInstance } from 'fastify';
import { GetBudgetUseCase } from '../../../application/use-cases/get-budget.use-case.js';
import { CreateBudgetItemUseCase } from '../../../application/use-cases/create-budget-item.use-case.js';
import { UpdateBudgetItemUseCase } from '../../../application/use-cases/update-budget-item.use-case.js';
import { DeleteBudgetItemUseCase } from '../../../application/use-cases/delete-budget-item.use-case.js';
import { CopyBudgetFromPreviousUseCase } from '../../../application/use-cases/copy-budget-from-previous.use-case.js';
import { ConfirmBudgetSuggestionsUseCase } from '../../../application/use-cases/confirm-budget-suggestions.use-case.js';
import {
  createBudgetItemBodySchema,
  updateBudgetItemBodySchema,
  confirmSuggestionsBodySchema,
} from '../schemas/budget.schema.js';

const USER_ID = 1; // MVP: hardcoded user

export interface BudgetRoutesOptions {
  getBudgetUseCase: GetBudgetUseCase;
  createBudgetItemUseCase: CreateBudgetItemUseCase;
  updateBudgetItemUseCase: UpdateBudgetItemUseCase;
  deleteBudgetItemUseCase: DeleteBudgetItemUseCase;
  copyBudgetFromPreviousUseCase: CopyBudgetFromPreviousUseCase;
  confirmBudgetSuggestionsUseCase: ConfirmBudgetSuggestionsUseCase;
}

export async function budgetRoutes(
  fastify: FastifyInstance,
  opts: BudgetRoutesOptions,
) {
  const {
    getBudgetUseCase,
    createBudgetItemUseCase,
    updateBudgetItemUseCase,
    deleteBudgetItemUseCase,
    copyBudgetFromPreviousUseCase,
    confirmBudgetSuggestionsUseCase,
  } = opts;

  // GET /budget?cycle=2026-03-25 — budget items + actuals for a cycle
  fastify.get('/', async (request, reply) => {
    const { cycle } = request.query as { cycle?: string };
    if (!cycle) {
      return reply.status(400).send({ error: 'Query param "cycle" is required (ISO date)' });
    }
    const result = await getBudgetUseCase.execute(USER_ID, cycle);
    return reply.send(result);
  });

  // POST /budget — create a budget item
  fastify.post('/', {
    schema: { body: createBudgetItemBodySchema },
  }, async (request, reply) => {
    const body = request.body as {
      cycle_start: string;
      name: string;
      type: 'ingreso' | 'gasto';
      amount: number;
      is_fixed?: boolean;
      category_id?: number | null;
      linked_description?: string | null;
    };

    const item = await createBudgetItemUseCase.execute({
      userId: USER_ID,
      cycleStart: body.cycle_start,
      name: body.name,
      type: body.type,
      amount: body.amount,
      isFixed: body.is_fixed ?? false,
      categoryId: body.category_id,
      linkedDescription: body.linked_description,
    });

    return reply.status(201).send(item);
  });

  // PUT /budget/:id — update a budget item
  fastify.put('/:id', {
    schema: { body: updateBudgetItemBodySchema },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      type?: 'ingreso' | 'gasto';
      amount?: number;
      is_fixed?: boolean;
      category_id?: number | null;
      linked_description?: string | null;
    };

    const item = await updateBudgetItemUseCase.execute(Number(id), USER_ID, {
      name: body.name,
      type: body.type,
      amount: body.amount,
      isFixed: body.is_fixed,
      categoryId: body.category_id,
      linkedDescription: body.linked_description,
    });

    return reply.send(item);
  });

  // DELETE /budget/:id — delete a budget item
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteBudgetItemUseCase.execute(Number(id), USER_ID);
    return reply.status(204).send();
  });

  // POST /budget/copy-previous?cycle=2026-04-25 — copy from previous cycle
  // Returns: { copied: [...], suggestions: [...] }
  fastify.post('/copy-previous', async (request, reply) => {
    const { cycle } = request.query as { cycle?: string };
    if (!cycle) {
      return reply.status(400).send({ error: 'Query param "cycle" is required (ISO date)' });
    }
    const result = await copyBudgetFromPreviousUseCase.execute(USER_ID, cycle);
    return reply.send(result);
  });

  // POST /budget/confirm-suggestions — create items from confirmed suggestions
  fastify.post('/confirm-suggestions', {
    schema: { body: confirmSuggestionsBodySchema },
  }, async (request, reply) => {
    const body = request.body as {
      cycle_start: string;
      items: Array<{
        name: string;
        type: 'ingreso' | 'gasto';
        amount: number;
        is_fixed?: boolean;
        category_id?: number | null;
        linked_description?: string | null;
      }>;
    };

    const created = await confirmBudgetSuggestionsUseCase.execute(
      USER_ID,
      body.cycle_start,
      body.items.map(i => ({
        name: i.name,
        type: i.type,
        amount: i.amount,
        isFixed: i.is_fixed ?? false,
        categoryId: i.category_id,
        linkedDescription: i.linked_description,
      })),
    );

    return reply.status(201).send({ data: created });
  });
}
