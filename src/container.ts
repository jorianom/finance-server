// Composition Root
// The ONLY file that knows all layers — wires everything together via manual DI

import { getPrismaClient } from './infrastructure/persistence/prisma/prisma.client.js';
import { getSupabaseClient } from './infrastructure/config/supabase.js';

// Repositories (Infrastructure → implements Domain ports)
import { PrismaTransactionRepository } from './infrastructure/persistence/prisma/transaction.repository.js';
import { PrismaImportRepository } from './infrastructure/persistence/prisma/import.repository.js';
import { PrismaRuleRepository } from './infrastructure/persistence/prisma/rule.repository.js';
import { PrismaCategoryRepository } from './infrastructure/persistence/prisma/category.repository.js';
import { PrismaUserRepository } from './infrastructure/persistence/prisma/user.repository.js';
import { PrismaDebtRepository } from './infrastructure/persistence/prisma/debt.repository.js';
import { PrismaDebtPaymentRepository } from './infrastructure/persistence/prisma/debt-payment.repository.js';
import { PrismaBudgetRepository } from './infrastructure/persistence/prisma/budget.repository.js';

// Storage adapter
import { SupabaseStorageAdapter } from './infrastructure/storage/supabase-storage.adapter.js';

// Parsers
import { BancolombiaParser } from './infrastructure/parsers/bancolombia.parser.js';
import { NequiParser } from './infrastructure/parsers/nequi.parser.js';
import { NequiPdfParser } from './infrastructure/parsers/nequi-pdf.parser.js';
import { DaviviendaPdfParser } from './infrastructure/parsers/davivienda-pdf.parser.js';
import { RappiPayPdfParser } from './infrastructure/parsers/rappipay-pdf.parser.js';

// Use Cases (Application layer)
import { ImportTransactionsUseCase } from './application/use-cases/import-transactions.use-case.js';
import { GetTransactionsUseCase } from './application/use-cases/get-transactions.use-case.js';
import { GetSummaryUseCase } from './application/use-cases/get-summary.use-case.js';
import { CreateRuleUseCase } from './application/use-cases/create-rule.use-case.js';
import { GetRulesUseCase } from './application/use-cases/get-rules.use-case.js';
import { ReclassifyTransactionsUseCase } from './application/use-cases/reclassify-transactions.use-case.js';
import { GetAvailableCyclesUseCase } from './application/use-cases/get-available-cycles.use-case.js';
import { GetUserSettingsUseCase } from './application/use-cases/get-user-settings.use-case.js';
import { UpdateUserSettingsUseCase } from './application/use-cases/update-user-settings.use-case.js';
import { UpdateRuleUseCase } from './application/use-cases/update-rule.use-case.js';
import { GetDebtsUseCase } from './application/use-cases/get-debts.use-case.js';
import { GetDebtDetailUseCase } from './application/use-cases/get-debt-detail.use-case.js';
import { CreateDebtUseCase } from './application/use-cases/create-debt.use-case.js';
import { UpdateDebtUseCase } from './application/use-cases/update-debt.use-case.js';
import { DeleteDebtUseCase } from './application/use-cases/delete-debt.use-case.js';
import { RecordDebtPaymentUseCase } from './application/use-cases/record-debt-payment.use-case.js';
import { UpdateDebtPaymentUseCase } from './application/use-cases/update-debt-payment.use-case.js';
import { DeleteDebtPaymentUseCase } from './application/use-cases/delete-debt-payment.use-case.js';
import { GetBudgetUseCase } from './application/use-cases/get-budget.use-case.js';
import { CreateBudgetItemUseCase } from './application/use-cases/create-budget-item.use-case.js';
import { UpdateBudgetItemUseCase } from './application/use-cases/update-budget-item.use-case.js';
import { DeleteBudgetItemUseCase } from './application/use-cases/delete-budget-item.use-case.js';
import { CopyBudgetFromPreviousUseCase } from './application/use-cases/copy-budget-from-previous.use-case.js';
import { ConfirmBudgetSuggestionsUseCase } from './application/use-cases/confirm-budget-suggestions.use-case.js';
import { EnrichTransactionUseCase } from './application/use-cases/enrich-transaction.use-case.js';
import { IngestTransactionUseCase } from './application/use-cases/ingest-transaction.use-case.js';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case.js';

export function createContainer() {
  // Infrastructure instances
  const prisma = getPrismaClient();
  const supabase = getSupabaseClient();

  // Repositories
  const transactionRepo = new PrismaTransactionRepository(prisma);
  const importRepo = new PrismaImportRepository(prisma);
  const ruleRepo = new PrismaRuleRepository(prisma);
  const categoryRepo = new PrismaCategoryRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const debtRepo = new PrismaDebtRepository(prisma);
  const debtPaymentRepo = new PrismaDebtPaymentRepository(prisma);
  const budgetRepo = new PrismaBudgetRepository(prisma);

  // Adapters
  const fileStorage = new SupabaseStorageAdapter(supabase);
  const parsers = [new BancolombiaParser(), new NequiParser()];
  const pdfParsers = [new NequiPdfParser(), new DaviviendaPdfParser(), new RappiPayPdfParser()];

  // Use Cases — injected with repository/service interfaces
  const importTransactionsUseCase = new ImportTransactionsUseCase(
    importRepo,
    transactionRepo,
    ruleRepo,
    categoryRepo,
    fileStorage,
    parsers,
    pdfParsers,
  );
  const getTransactionsUseCase = new GetTransactionsUseCase(transactionRepo);
  const getSummaryUseCase = new GetSummaryUseCase(transactionRepo);
  const createRuleUseCase = new CreateRuleUseCase(ruleRepo);
  const getRulesUseCase = new GetRulesUseCase(ruleRepo);
  const updateRuleUseCase = new UpdateRuleUseCase(ruleRepo);
  const reclassifyTransactionsUseCase = new ReclassifyTransactionsUseCase(transactionRepo, ruleRepo, categoryRepo);
  const getAvailableCyclesUseCase = new GetAvailableCyclesUseCase(transactionRepo);
  const getUserSettingsUseCase = new GetUserSettingsUseCase(userRepo);
  const updateUserSettingsUseCase = new UpdateUserSettingsUseCase(userRepo);
  const getDebtsUseCase = new GetDebtsUseCase(debtRepo);
  const getDebtDetailUseCase = new GetDebtDetailUseCase(debtRepo, debtPaymentRepo);
  const createDebtUseCase = new CreateDebtUseCase(debtRepo);
  const updateDebtUseCase = new UpdateDebtUseCase(debtRepo);
  const deleteDebtUseCase = new DeleteDebtUseCase(debtRepo);
  const recordDebtPaymentUseCase = new RecordDebtPaymentUseCase(debtRepo, debtPaymentRepo);
  const updateDebtPaymentUseCase = new UpdateDebtPaymentUseCase(debtRepo, debtPaymentRepo);
  const deleteDebtPaymentUseCase = new DeleteDebtPaymentUseCase(debtRepo, debtPaymentRepo);
  const getBudgetUseCase = new GetBudgetUseCase(budgetRepo, userRepo);
  const createBudgetItemUseCase = new CreateBudgetItemUseCase(budgetRepo);
  const updateBudgetItemUseCase = new UpdateBudgetItemUseCase(budgetRepo);
  const deleteBudgetItemUseCase = new DeleteBudgetItemUseCase(budgetRepo);
  const copyBudgetFromPreviousUseCase = new CopyBudgetFromPreviousUseCase(budgetRepo, userRepo);
  const confirmBudgetSuggestionsUseCase = new ConfirmBudgetSuggestionsUseCase(budgetRepo);

  // Account resolver for enrich use case (bank_name → account_id)
  const resolveAccountId = async (bankName: string): Promise<number | null> => {
    const account = await prisma.accounts.findFirst({
      where: { user_id: 1n, bank_name: { contains: bankName, mode: 'insensitive' } },
      select: { id: true },
    });
    return account ? Number(account.id) : null;
  };
  const enrichTransactionUseCase = new EnrichTransactionUseCase(
    transactionRepo, ruleRepo, categoryRepo, resolveAccountId,
  );
  const ingestTransactionUseCase = new IngestTransactionUseCase(
    transactionRepo, ruleRepo, categoryRepo, resolveAccountId,
  );
  const createTransactionUseCase = new CreateTransactionUseCase(
    transactionRepo, ruleRepo,
  );

  return {
    prisma,
    importTransactionsUseCase,
    getTransactionsUseCase,
    getSummaryUseCase,
    createRuleUseCase,
    getRulesUseCase,
    updateRuleUseCase,
    reclassifyTransactionsUseCase,
    getAvailableCyclesUseCase,
    getUserSettingsUseCase,
    updateUserSettingsUseCase,
    getDebtsUseCase,
    getDebtDetailUseCase,
    createDebtUseCase,
    updateDebtUseCase,
    deleteDebtUseCase,
    recordDebtPaymentUseCase,
    updateDebtPaymentUseCase,
    deleteDebtPaymentUseCase,
    getBudgetUseCase,
    createBudgetItemUseCase,
    updateBudgetItemUseCase,
    deleteBudgetItemUseCase,
    copyBudgetFromPreviousUseCase,
    confirmBudgetSuggestionsUseCase,
    enrichTransactionUseCase,
    ingestTransactionUseCase,
    createTransactionUseCase,
  };
}
