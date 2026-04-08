// App: Fastify instance setup, plugins and route registration

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';

import { createContainer } from './container.js';
import { importRoutes } from './interface/http/routes/import.routes.js';
import { transactionRoutes } from './interface/http/routes/transaction.routes.js';
import { userRoutes } from './interface/http/routes/user.routes.js';
import { ruleRoutes } from './interface/http/routes/rule.routes.js';
import { debtRoutes } from './interface/http/routes/debt.routes.js';
import { budgetRoutes } from './interface/http/routes/budget.routes.js';
import { seedRoutes } from './interface/http/routes/seed.routes.js';
import { UpdateRuleUseCase } from './application/use-cases/update-rule.use-case.js';

export function buildApp() {
  const fastify = Fastify({ logger: true });
  const container = createContainer();

  // Plugins
  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

  // Routes — use cases injected via options
  fastify.register(importRoutes, {
    prefix: '/imports',
    importTransactionsUseCase: container.importTransactionsUseCase,
  });

  fastify.register(transactionRoutes, {
    prefix: '/transactions',
    getTransactionsUseCase: container.getTransactionsUseCase,
    getSummaryUseCase: container.getSummaryUseCase,
    reclassifyTransactionsUseCase: container.reclassifyTransactionsUseCase,
    getAvailableCyclesUseCase: container.getAvailableCyclesUseCase,
    getUserSettingsUseCase: container.getUserSettingsUseCase,
    enrichTransactionUseCase: container.enrichTransactionUseCase,
  });

  fastify.register(userRoutes, {
    prefix: '/users',
    getUserSettingsUseCase: container.getUserSettingsUseCase,
    updateUserSettingsUseCase: container.updateUserSettingsUseCase,
  });

  fastify.register(ruleRoutes, {
    prefix: '/rules',
    getRulesUseCase: container.getRulesUseCase,
    createRuleUseCase: container.createRuleUseCase,
    updateRuleUseCase: container.updateRuleUseCase,
    prisma: container.prisma,
  });

  fastify.register(debtRoutes, {
    prefix: '/debts',
    getDebtsUseCase: container.getDebtsUseCase,
    getDebtDetailUseCase: container.getDebtDetailUseCase,
    createDebtUseCase: container.createDebtUseCase,
    updateDebtUseCase: container.updateDebtUseCase,
    deleteDebtUseCase: container.deleteDebtUseCase,
    recordDebtPaymentUseCase: container.recordDebtPaymentUseCase,
    updateDebtPaymentUseCase: container.updateDebtPaymentUseCase,
    deleteDebtPaymentUseCase: container.deleteDebtPaymentUseCase,
  });

  fastify.register(budgetRoutes, {
    prefix: '/budget',
    getBudgetUseCase: container.getBudgetUseCase,
    createBudgetItemUseCase: container.createBudgetItemUseCase,
    updateBudgetItemUseCase: container.updateBudgetItemUseCase,
    deleteBudgetItemUseCase: container.deleteBudgetItemUseCase,
    copyBudgetFromPreviousUseCase: container.copyBudgetFromPreviousUseCase,
    confirmBudgetSuggestionsUseCase: container.confirmBudgetSuggestionsUseCase,
  });

  // Health check
  fastify.get('/', async () => ({ status: 'ok' }));

  // Categories — list and create categories for the hardcoded user
  fastify.get('/categories', async () => {
    const categories = await container.prisma.categories.findMany({
      where: { user_id: 1n },
      orderBy: { name: 'asc' },
    });
    return categories.map(c => ({
      id: Number(c.id),
      name: c.name,
      type: c.type,
    }));
  });

  fastify.post('/categories', async (request, reply) => {
    const body = request.body as { name: string; type: string };
    const category = await container.prisma.categories.create({
      data: { name: body.name, type: body.type, user_id: 1n },
    });
    return reply.status(201).send({
      id: Number(category.id),
      name: category.name,
      type: category.type,
    });
  });

  fastify.put('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; type?: string };
    const category = await container.prisma.categories.update({
      where: { id: BigInt(id) },
      data: { ...(body.name && { name: body.name }), ...(body.type && { type: body.type }) },
    });
    return reply.send({ id: Number(category.id), name: category.name, type: category.type });
  });

  fastify.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await container.prisma.categories.delete({ where: { id: BigInt(id) } });
    return reply.status(204).send();
  });

  // Accounts — list all accounts for the hardcoded user
  fastify.get('/accounts', async () => {
    const accounts = await container.prisma.accounts.findMany({
      where: { user_id: 1n },
      orderBy: { id: 'asc' },
    });
    return accounts.map(a => ({
      id: Number(a.id),
      bankName: a.bank_name,
    }));
  });

  // Seed (development only — creates user_id=1, accounts and categories)
  fastify.register(seedRoutes, {
    prefix: '/seed',
    prisma: container.prisma,
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await container.prisma.$disconnect();
  });

  return fastify;
}
