// Interface: Seed Routes (development only)
// POST /seed — Creates base user, account and categories for user_id=1

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '../../../generated/prisma/client.js';

export interface SeedRoutesOptions {
  prisma: PrismaClient;
}

export async function seedRoutes(fastify: FastifyInstance, opts: SeedRoutesOptions) {
  const { prisma } = opts;

  fastify.get('/', async (_request, reply) => {
    // 1. Upsert user id=1
    const user = await prisma.users.upsert({
      where: { email: 'dev@finance-me.local' },
      update: {},
      create: { email: 'dev@finance-me.local' },
    });

    const userId = user.id;

    // 2. Upsert accounts — create any that don't exist yet
    const accountDefs = [
      { bank_name: 'Bancolombia' },
      { bank_name: 'Nequi' },
      { bank_name: 'Davivienda' },
      { bank_name: 'RappiPay' },
    ];

    const existingAccounts = await prisma.accounts.findMany({
      where: { user_id: userId },
    });

    for (const def of accountDefs) {
      const exists = existingAccounts.some(a => a.bank_name === def.bank_name);
      if (!exists) {
        const created = await prisma.accounts.create({
          data: { user_id: userId, ...def },
        });
        existingAccounts.push(created);
      }
    }

    const accounts = existingAccounts;

    // 3. Upsert categories by name — add missing ones without touching existing
    const categoryDefs = [
      { name: 'Suscripciones',      type: 'gasto'   },
      { name: 'Alimentación',       type: 'gasto'   },
      { name: 'Transporte',         type: 'gasto'   },
      { name: 'Salud',              type: 'gasto'   },
      { name: 'Entretenimiento',    type: 'gasto'   },
      { name: 'Ingresos',           type: 'ingreso' },
      { name: 'Servicios Públicos', type: 'gasto'   },
      { name: 'Transferencias',     type: 'gasto'   },
      { name: 'Impuestos y Cargos', type: 'gasto'   },
      { name: 'Telecomunicaciones', type: 'gasto'   },
      { name: 'Ingreso General',    type: 'ingreso' },
      { name: 'Gasto General',      type: 'gasto'   },
    ];

    const existingCategories = await prisma.categories.findMany({
      where: { user_id: userId },
    });

    for (const def of categoryDefs) {
      const exists = existingCategories.some(c => c.name === def.name);
      if (!exists) {
        const created = await prisma.categories.create({
          data: { user_id: userId, name: def.name, type: def.type },
        });
        existingCategories.push(created);
      }
    }

    const categories = existingCategories;

    // 4. Upsert rules by keyword — add missing ones without touching existing
    const existingRules = await prisma.rules.findMany({ where: { user_id: userId } });
    const existingKeywords = new Set(existingRules.map(r => r.keyword));
    const catMap = new Map(categories.map(c => [c.name, c.id]));

    const ruleDefs = [
      // Suscripciones
      { keyword: 'netflix',                  merchantName: 'Netflix',       categoryName: 'Suscripciones',      priority: 1  },
      { keyword: 'spotify',                  merchantName: 'Spotify',       categoryName: 'Suscripciones',      priority: 2  },
      { keyword: 'youtube',                  merchantName: 'YouTube',       categoryName: 'Suscripciones',      priority: 3  },
      { keyword: 'apple',                    merchantName: 'Apple',         categoryName: 'Suscripciones',      priority: 4  },
      { keyword: 'google',                   merchantName: 'Google',        categoryName: 'Suscripciones',      priority: 5  },
      { keyword: 'dlocal',                   merchantName: 'DLocal',        categoryName: 'Suscripciones',      priority: 6  },
      // Telecomunicaciones
      { keyword: 'claro',                    merchantName: 'Claro',         categoryName: 'Telecomunicaciones', priority: 9  },
      // Alimentación
      { keyword: 'rappi',                    merchantName: 'Rappi',         categoryName: 'Alimentación',       priority: 10 },
      { keyword: 'uber eats',                merchantName: 'Uber Eats',     categoryName: 'Alimentación',       priority: 11 },
      { keyword: 'ifood',                    merchantName: 'iFood',         categoryName: 'Alimentación',       priority: 12 },
      { keyword: 'exito',                    merchantName: 'Éxito',         categoryName: 'Alimentación',       priority: 13 },
      { keyword: 'éxito',                    merchantName: 'Éxito',         categoryName: 'Alimentación',       priority: 14 },
      { keyword: 'supermercado',             merchantName: null,            categoryName: 'Alimentación',       priority: 15 },
      { keyword: 'pago en qr bre-b',         merchantName: null,            categoryName: 'Alimentación',       priority: 16 },
      { keyword: 'pago en qr',               merchantName: null,            categoryName: 'Alimentación',       priority: 17 },
      // Transporte
      { keyword: 'uber',                     merchantName: 'Uber',          categoryName: 'Transporte',         priority: 20 },
      // Ingresos
      { keyword: 'nomina',                   merchantName: null,            categoryName: 'Ingresos',           priority: 30 },
      { keyword: 'abono en cuenta',          merchantName: null,            categoryName: 'Ingresos',           priority: 31 },
      { keyword: 'rendimientos financieros', merchantName: null,            categoryName: 'Ingresos',           priority: 32 },
      { keyword: 'recibi por bre-b',         merchantName: null,            categoryName: 'Ingresos',           priority: 33 },
      { keyword: 'transferencia de otra entidad', merchantName: null,       categoryName: 'Ingresos',           priority: 34 },
      { keyword: 'daviplata',                merchantName: 'Daviplata',     categoryName: 'Ingresos',           priority: 35 },
      // Servicios Públicos
      { keyword: 'enel',                     merchantName: 'ENEL',          categoryName: 'Servicios Públicos', priority: 40 },
      { keyword: 'factura',                  merchantName: null,            categoryName: 'Servicios Públicos', priority: 41 },
      // Impuestos y Cargos
      { keyword: 'gravamen',                 merchantName: null,            categoryName: 'Impuestos y Cargos', priority: 50 },
      { keyword: 'pago de intereses',        merchantName: null,            categoryName: 'Impuestos y Cargos', priority: 51 },
      { keyword: 'pago credito',             merchantName: null,            categoryName: 'Impuestos y Cargos', priority: 52 },
      // Transferencias
      { keyword: 'envio con bre-b',          merchantName: null,            categoryName: 'Transferencias',     priority: 60 },
      { keyword: 'dcto.transferencia',       merchantName: null,            categoryName: 'Transferencias',     priority: 61 },
      { keyword: 'transferencia a llave',    merchantName: null,            categoryName: 'Transferencias',     priority: 62 },
      // Entretenimiento
      { keyword: 'amazon',                   merchantName: 'Amazon',        categoryName: 'Entretenimiento',    priority: 70 },
      { keyword: 'mercado libre',            merchantName: 'Mercado Libre', categoryName: 'Entretenimiento',    priority: 71 },
      { keyword: 'falabella',                merchantName: 'Falabella',     categoryName: 'Entretenimiento',    priority: 72 },
    ];

    for (const def of ruleDefs) {
      if (existingKeywords.has(def.keyword)) continue;
      const catId = catMap.get(def.categoryName);
      if (!catId) continue;
      const created = await prisma.rules.create({
        data: {
          user_id: userId,
          keyword: def.keyword,
          merchant_name: def.merchantName ?? null,
          category_id: catId,
          priority: def.priority,
        },
      });
      existingRules.push(created);
      existingKeywords.add(def.keyword);
    }

    const rules = existingRules;

    return reply.status(201).send({
      message: 'Seed completado',
      user: { id: Number(user.id), email: user.email },
      accounts: accounts.map(a => ({
        id: Number(a.id),
        bankName: a.bank_name,
      })),
      categories: categories.map(c => ({
        id: Number(c.id),
        name: c.name,
        type: c.type,
      })),
      rules: rules.map(r => ({
        id: Number(r.id),
        keyword: r.keyword,
        merchantName: r.merchant_name,
        categoryId: Number(r.category_id),
        priority: r.priority,
      })),
    });
  });
}
