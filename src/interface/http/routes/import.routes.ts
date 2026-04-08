// Interface: Import Routes
// POST /imports — Multipart file upload + CSV processing pipeline

import { FastifyInstance } from 'fastify';
import { ImportTransactionsUseCase } from '../../../application/use-cases/import-transactions.use-case.js';
import { PeriodConflictError } from '../../../domain/errors/period-conflict.error.js';

const USER_ID = 1; // MVP: hardcoded user

export interface ImportRoutesOptions {
  importTransactionsUseCase: ImportTransactionsUseCase;
}

export async function importRoutes(
  fastify: FastifyInstance,
  opts: ImportRoutesOptions,
) {
  const { importTransactionsUseCase } = opts;

  fastify.post('/', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // Validate file extension
    const fileName = data.filename;
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'pdf') {
      return reply.status(400).send({ error: 'Only CSV and PDF files are supported' });
    }

    const fileType: 'csv' | 'pdf' = ext as 'csv' | 'pdf';

    // Read account_id from form fields
    const fields = data.fields;
    const accountIdField = fields['account_id'];
    if (!accountIdField || !('value' in accountIdField)) {
      return reply.status(400).send({ error: 'account_id is required' });
    }

    const accountId = parseInt(String(accountIdField.value), 10);
    if (isNaN(accountId)) {
      return reply.status(400).send({ error: 'account_id must be a number' });
    }

    // Read optional password field (for password-protected PDFs)
    const passwordField = fields['password'];
    const password = passwordField && 'value' in passwordField
      ? String(passwordField.value) || undefined
      : undefined;

    // Read optional replace_existing flag
    const replaceField = fields['replace_existing'];
    const replaceExisting = replaceField && 'value' in replaceField
      ? String(replaceField.value) === 'true'
      : false;

    // Read file buffer
    const fileBuffer = await data.toBuffer();

    try {
      const result = await importTransactionsUseCase.execute({
        userId: USER_ID,
        accountId,
        fileName,
        fileBuffer,
        fileType,
        password,
        replaceExisting,
      });

      return reply.status(201).send(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.constructor.name : '';

      // Period conflict (Nequi re-import) → 409 with details for frontend confirmation
      if (err instanceof PeriodConflictError) {
        return reply.status(409).send({
          conflict: true,
          period: err.period,
          existingCount: err.existingCount,
        });
      }

      // Password-related PDF errors → 400
      if (name === 'PasswordException' || msg.includes('password') || msg.includes('Password')) {
        return reply.status(400).send({
          error: 'El PDF está protegido. Ingresa la contraseña (cédula) para descifrarlo.',
        });
      }

      // Bank not recognized → 400
      if (msg.includes('Banco no reconocido')) {
        return reply.status(400).send({ error: msg });
      }

      throw err;
    }
  });
}
