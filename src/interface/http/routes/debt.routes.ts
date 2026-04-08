// Interface: Debt Routes
// CRUD for debts and debt payments with amortization schedule

import { FastifyInstance } from 'fastify';
import { GetDebtsUseCase } from '../../../application/use-cases/get-debts.use-case.js';
import { GetDebtDetailUseCase } from '../../../application/use-cases/get-debt-detail.use-case.js';
import { CreateDebtUseCase } from '../../../application/use-cases/create-debt.use-case.js';
import { UpdateDebtUseCase } from '../../../application/use-cases/update-debt.use-case.js';
import { DeleteDebtUseCase } from '../../../application/use-cases/delete-debt.use-case.js';
import { RecordDebtPaymentUseCase } from '../../../application/use-cases/record-debt-payment.use-case.js';
import { UpdateDebtPaymentUseCase } from '../../../application/use-cases/update-debt-payment.use-case.js';
import { DeleteDebtPaymentUseCase } from '../../../application/use-cases/delete-debt-payment.use-case.js';
import {
  createDebtBodySchema,
  updateDebtBodySchema,
  recordPaymentBodySchema,
  updatePaymentBodySchema,
} from '../schemas/debt.schema.js';

const USER_ID = 1; // MVP: hardcoded user

export interface DebtRoutesOptions {
  getDebtsUseCase: GetDebtsUseCase;
  getDebtDetailUseCase: GetDebtDetailUseCase;
  createDebtUseCase: CreateDebtUseCase;
  updateDebtUseCase: UpdateDebtUseCase;
  deleteDebtUseCase: DeleteDebtUseCase;
  recordDebtPaymentUseCase: RecordDebtPaymentUseCase;
  updateDebtPaymentUseCase: UpdateDebtPaymentUseCase;
  deleteDebtPaymentUseCase: DeleteDebtPaymentUseCase;
}

export async function debtRoutes(
  fastify: FastifyInstance,
  opts: DebtRoutesOptions,
) {
  const {
    getDebtsUseCase,
    getDebtDetailUseCase,
    createDebtUseCase,
    updateDebtUseCase,
    deleteDebtUseCase,
    recordDebtPaymentUseCase,
    updateDebtPaymentUseCase,
    deleteDebtPaymentUseCase,
  } = opts;

  // GET /debts — list all debts
  fastify.get('/', async (_request, reply) => {
    const debts = await getDebtsUseCase.execute(USER_ID);
    return reply.send({ data: debts });
  });

  // POST /debts — create a debt
  fastify.post('/', {
    schema: { body: createDebtBodySchema },
  }, async (request, reply) => {
    const body = request.body as {
      name: string;
      entity: string;
      initial_balance: number;
      monthly_rate: number;
      min_payment: number;
      start_date: string;
      linked_description?: string;
    };

    const debt = await createDebtUseCase.execute({
      userId: USER_ID,
      name: body.name,
      entity: body.entity,
      initialBalance: body.initial_balance,
      currentBalance: body.initial_balance, // starts equal to initial
      monthlyRate: body.monthly_rate,
      minPayment: body.min_payment,
      startDate: body.start_date,
      linkedDescription: body.linked_description,
    });

    return reply.status(201).send(debt);
  });

  // GET /debts/:id — debt detail with payments + amortization
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getDebtDetailUseCase.execute(Number(id), USER_ID);

    if (!result) {
      return reply.status(404).send({ error: 'Debt not found' });
    }

    return reply.send(result);
  });

  // PUT /debts/:id — update debt
  fastify.put('/:id', {
    schema: { body: updateDebtBodySchema },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      entity?: string;
      current_balance?: number;
      monthly_rate?: number;
      min_payment?: number;
      linked_description?: string | null;
      status?: 'active' | 'paid_off';
    };

    const debt = await updateDebtUseCase.execute(Number(id), USER_ID, {
      name: body.name,
      entity: body.entity,
      currentBalance: body.current_balance,
      monthlyRate: body.monthly_rate,
      minPayment: body.min_payment,
      linkedDescription: body.linked_description,
      status: body.status,
    });

    return reply.send(debt);
  });

  // DELETE /debts/:id — delete debt
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteDebtUseCase.execute(Number(id), USER_ID);
    return reply.status(204).send();
  });

  // POST /debts/:id/payments — record a payment
  fastify.post('/:id/payments', {
    schema: { body: recordPaymentBodySchema },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      cycle_start: string;
      actual_amount: number;
    };

    const payment = await recordDebtPaymentUseCase.execute({
      debtId: Number(id),
      userId: USER_ID,
      cycleStart: body.cycle_start,
      actualAmount: body.actual_amount,
    });

    return reply.status(201).send(payment);
  });

  // PUT /debts/:id/payments/:paymentId — update a payment
  fastify.put('/:id/payments/:paymentId', {
    schema: { body: updatePaymentBodySchema },
  }, async (request, reply) => {
    const { id, paymentId } = request.params as { id: string; paymentId: string };
    const body = request.body as { actual_amount: number };

    const payment = await updateDebtPaymentUseCase.execute({
      paymentId: Number(paymentId),
      debtId: Number(id),
      userId: USER_ID,
      actualAmount: body.actual_amount,
    });

    return reply.send(payment);
  });

  // DELETE /debts/:id/payments/:paymentId — delete a payment
  fastify.delete('/:id/payments/:paymentId', async (request, reply) => {
    const { id, paymentId } = request.params as { id: string; paymentId: string };
    await deleteDebtPaymentUseCase.execute(Number(paymentId), Number(id), USER_ID);
    return reply.status(204).send();
  });
}
