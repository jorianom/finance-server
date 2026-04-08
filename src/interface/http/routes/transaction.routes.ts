// Interface: Transaction Routes
// GET /transactions — Paginated, filtered list
// GET /transactions/summary — Income/expense totals by category
// GET /transactions/cycles — Available budget cycles

import { FastifyInstance } from 'fastify';
import { GetTransactionsUseCase } from '../../../application/use-cases/get-transactions.use-case.js';
import { GetSummaryUseCase } from '../../../application/use-cases/get-summary.use-case.js';
import { ReclassifyTransactionsUseCase } from '../../../application/use-cases/reclassify-transactions.use-case.js';
import { GetAvailableCyclesUseCase } from '../../../application/use-cases/get-available-cycles.use-case.js';
import { GetUserSettingsUseCase } from '../../../application/use-cases/get-user-settings.use-case.js';
import { EnrichTransactionUseCase } from '../../../application/use-cases/enrich-transaction.use-case.js';
import { transactionQuerySchema, summaryQuerySchema } from '../schemas/transaction.schema.js';

const USER_ID = 1; // MVP: hardcoded user

export interface TransactionRoutesOptions {
  getTransactionsUseCase: GetTransactionsUseCase;
  getSummaryUseCase: GetSummaryUseCase;
  reclassifyTransactionsUseCase: ReclassifyTransactionsUseCase;
  getAvailableCyclesUseCase: GetAvailableCyclesUseCase;
  getUserSettingsUseCase: GetUserSettingsUseCase;
  enrichTransactionUseCase: EnrichTransactionUseCase;
}

export async function transactionRoutes(
  fastify: FastifyInstance,
  opts: TransactionRoutesOptions,
) {
  const {
    getTransactionsUseCase,
    getSummaryUseCase,
    reclassifyTransactionsUseCase,
    getAvailableCyclesUseCase,
    getUserSettingsUseCase,
    enrichTransactionUseCase,
  } = opts;

  fastify.get('/cycles', async (_request, reply) => {
    const { cycleStartDay } = await getUserSettingsUseCase.execute(USER_ID);
    const result = await getAvailableCyclesUseCase.execute(USER_ID, cycleStartDay);
    return reply.send(result);
  });

  fastify.get('/', {
    schema: { querystring: transactionQuerySchema },
  }, async (request, reply) => {
    const query = request.query as {
      page?: number;
      limit?: number;
      category_id?: number;
      account_id?: number;
      from?: string;
      to?: string;
      cycle?: string;
    };

    const result = await getTransactionsUseCase.execute({
      userId: USER_ID,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      categoryId: query.category_id,
      accountId: query.account_id,
      from: query.from,
      to: query.to,
      cycle: query.cycle,
    });

    return reply.send({
      data: result.data,
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  });

  fastify.get('/summary', {
    schema: { querystring: summaryQuerySchema },
  }, async (request, reply) => {
    const query = request.query as {
      account_id?: number;
      from?: string;
      to?: string;
      cycle?: string;
    };

    const result = await getSummaryUseCase.execute({
      userId: USER_ID,
      accountId: query.account_id,
      from: query.from,
      to: query.to,
      cycle: query.cycle,
    });

    return reply.send(result);
  });

  fastify.post('/reclassify', async (_request, reply) => {
    const updated = await reclassifyTransactionsUseCase.execute(USER_ID);
    return reply.send({ updated });
  });

  fastify.post('/enrich', async (request, reply) => {
    // API key auth
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env['ENRICH_API_KEY'];
    if (!expectedKey || apiKey !== expectedKey) {
      return reply.status(401).send({ error: 'Invalid or missing API key' });
    }

    const body = request.body as {
      account_id?: number;
      bank_name?: string;
      date: string;
      amount: number;
      merchant: string;
      reference?: string;
      email_id?: string;
    };

    if (!body.date || !body.amount || !body.merchant) {
      return reply.status(400).send({ error: 'date, amount, and merchant are required' });
    }
    if (!body.account_id && !body.bank_name) {
      return reply.status(400).send({ error: 'account_id or bank_name is required' });
    }

    const result = await enrichTransactionUseCase.execute(USER_ID, {
      accountId: body.account_id,
      bankName: body.bank_name,
      date: body.date,
      amount: body.amount,
      merchant: body.merchant,
      reference: body.reference,
      emailId: body.email_id,
    });

    return reply.send(result);
  });
}

