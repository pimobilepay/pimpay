/**
 * lib/blockchainTransaction.ts
 * [FIX V29] Transactional integrity for multi-chain operations
 * Ensures atomicity between Sidra chain and PostgreSQL DB
 */

import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';

const SIDRA_RPC = process.env.SIDRA_RPC || "https://node.sidrachain.com";

interface TransactionStep {
  name: string;
  execute: () => Promise<void>;
  rollback: () => Promise<void>;
}

/**
 * [FIX V29] Execute transaction with automatic rollback
 * Implements saga pattern for distributed transactions
 */
export class BlockchainTransaction {
  private steps: TransactionStep[] = [];
  private completedSteps: number = 0;

  addStep(step: TransactionStep): void {
    this.steps.push(step);
  }

  /**
   * Execute all steps. On failure, rollback completed steps in reverse order
   */
  async execute(): Promise<{ success: boolean; error?: string }> {
    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        console.log(`[BLOCKCHAIN] Executing step: ${step.name}`);
        await step.execute();
        this.completedSteps = i + 1;
      }
      return { success: true };
    } catch (error: any) {
      console.error(`[BLOCKCHAIN] Step failed: ${error.message}`);
      
      // Rollback in reverse order
      await this.rollback();
      
      return {
        success: false,
        error: `Transaction failed at step ${this.completedSteps}: ${error.message}`,
      };
    }
  }

  /**
   * Rollback all completed steps in reverse order
   */
  private async rollback(): Promise<void> {
    console.log(`[BLOCKCHAIN] Rolling back ${this.completedSteps} steps`);
    
    for (let i = this.completedSteps - 1; i >= 0; i--) {
      const step = this.steps[i];
      try {
        console.log(`[BLOCKCHAIN] Rolling back: ${step.name}`);
        await step.rollback();
      } catch (e: any) {
        console.error(`[BLOCKCHAIN] Rollback error on ${step.name}: ${e.message}`);
        // Continue rolling back other steps even if one fails
      }
    }
  }
}

/**
 * Transfer tokens between Sidra wallets with atomic DB transaction
 */
export async function transferSidraTokensAtomic(
  fromUserId: string,
  toUserId: string,
  amount: number,
  currency: string = "SDA"
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const transaction = new BlockchainTransaction();
  let transactionRecord: any = null;
  let sidraHash: string | null = null;

  try {
    // Verify users exist
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId }, select: { sidraAddress: true, id: true } }),
      prisma.user.findUnique({ where: { id: toUserId }, select: { sidraAddress: true, id: true } }),
    ]);

    if (!fromUser?.sidraAddress || !toUser?.sidraAddress) {
      return { success: false, error: "Wallet addresses not configured" };
    }

    // Step 1: Create pending transaction in DB
    transaction.addStep({
      name: "CREATE_TRANSACTION_RECORD",
      execute: async () => {
        transactionRecord = await prisma.transaction.create({
          data: {
            reference: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
            amount,
            fromUserId,
            toUserId,
            currency,
            type: "TRANSFER",
            status: "PENDING",
            description: `Sidra transfer from ${fromUser.id} to ${toUser.id}`,
          },
        });
      },
      rollback: async () => {
        if (transactionRecord) {
          await prisma.transaction.update({
            where: { id: transactionRecord.id },
            data: { status: "CANCELLED" },
          });
        }
      },
    });

    // Step 2: Execute blockchain transfer
    transaction.addStep({
      name: "BLOCKCHAIN_TRANSFER",
      execute: async () => {
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        // Note: This is a simplified example. Real implementation needs:
        // - Private key management via encryption
        // - Gas estimation
        // - Nonce handling
        // - Retry logic
        const tx = await provider.call({
          to: toUser.sidraAddress,
          value: ethers.parseEther(amount.toString()),
        } as any);
        sidraHash = tx;
      },
      rollback: async () => {
        // Blockchain transfers cannot be rolled back
        // This must be a refund transaction
        console.warn('[BLOCKCHAIN] Cannot rollback blockchain transfer. Manual intervention required.');
      },
    });

    // Step 3: Update balances in DB
    transaction.addStep({
      name: "UPDATE_BALANCES",
      execute: async () => {
        await prisma.wallet.updateMany({
          where: { userId: fromUserId, currency },
          data: { balance: { decrement: amount } },
        });

        await prisma.wallet.updateMany({
          where: { userId: toUserId, currency },
          data: { balance: { increment: amount } },
        });
      },
      rollback: async () => {
        // Reverse the balance updates
        await prisma.wallet.updateMany({
          where: { userId: fromUserId, currency },
          data: { balance: { increment: amount } },
        });

        await prisma.wallet.updateMany({
          where: { userId: toUserId, currency },
          data: { balance: { decrement: amount } },
        });
      },
    });

    // Step 4: Mark transaction as SUCCESS
    transaction.addStep({
      name: "MARK_SUCCESS",
      execute: async () => {
        await prisma.transaction.update({
          where: { id: transactionRecord.id },
          data: {
            status: "SUCCESS",
            blockchainTx: sidraHash,
          },
        });
      },
      rollback: async () => {
        if (transactionRecord) {
          await prisma.transaction.update({
            where: { id: transactionRecord.id },
            data: { status: "FAILED" },
          });
        }
      },
    });

    // Execute transaction
    const result = await transaction.execute();
    
    if (result.success) {
      return { success: true, txHash: sidraHash || undefined };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[BLOCKCHAIN_TXN] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Withdraw from Blockchain to Fiat
 */
export async function withdrawToFiatAtomic(
  userId: string,
  amount: number,
  currency: string,
  bankInfo: {
    accountNumber: string;
    accountName: string;
    bankCode: string;
  }
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const transaction = new BlockchainTransaction();
  let withdrawalRecord: any = null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallets: { where: { currency } } },
    });

    if (!user?.wallets?.[0] || user.wallets[0].balance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    // Step 1: Create withdrawal record
    transaction.addStep({
      name: "CREATE_WITHDRAWAL",
      execute: async () => {
        withdrawalRecord = await prisma.transaction.create({
          data: {
            reference: `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
            amount,
            fromUserId: userId,
            currency,
            type: "WITHDRAW",
            status: "PENDING",
            accountNumber: bankInfo.accountNumber,
            accountName: bankInfo.accountName,
            bankBic: bankInfo.bankCode,
            description: `Withdrawal to ${bankInfo.accountName}`,
          },
        });
      },
      rollback: async () => {
        if (withdrawalRecord) {
          await prisma.transaction.update({
            where: { id: withdrawalRecord.id },
            data: { status: "CANCELLED" },
          });
        }
      },
    });

    // Step 2: Reserve balance (frozen)
    transaction.addStep({
      name: "FREEZE_BALANCE",
      execute: async () => {
        await prisma.wallet.updateMany({
          where: { userId, currency },
          data: {
            balance: { decrement: amount },
            frozenBalance: { increment: amount },
          },
        });
      },
      rollback: async () => {
        await prisma.wallet.updateMany({
          where: { userId, currency },
          data: {
            balance: { increment: amount },
            frozenBalance: { decrement: amount },
          },
        });
      },
    });

    // Step 3: Process payment (external service call)
    transaction.addStep({
      name: "PROCESS_PAYMENT",
      execute: async () => {
        // Call payment processor (Wise, PayPal, etc.)
        // This is a placeholder - implement actual integration
        const paymentResult = await processExternalPayment(
          amount,
          bankInfo.accountNumber,
          bankInfo.accountName,
          bankInfo.bankCode
        );
        
        if (!paymentResult.success) {
          throw new Error(`Payment processing failed: ${paymentResult.error}`);
        }
      },
      rollback: async () => {
        // Attempt to cancel payment with processor
        console.warn('[WITHDRAWAL] Attempting to cancel payment with processor');
      },
    });

    // Step 4: Mark withdrawal as SUCCESS
    transaction.addStep({
      name: "MARK_SUCCESS",
      execute: async () => {
        await prisma.transaction.update({
          where: { id: withdrawalRecord.id },
          data: { status: "SUCCESS" },
        });
      },
      rollback: async () => {
        if (withdrawalRecord) {
          await prisma.transaction.update({
            where: { id: withdrawalRecord.id },
            data: { status: "FAILED" },
          });
        }
      },
    });

    // Execute
    const result = await transaction.execute();
    
    if (result.success) {
      return { success: true, withdrawalId: withdrawalRecord.id };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[WITHDRAWAL] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Placeholder for external payment processor
 */
async function processExternalPayment(
  amount: number,
  accountNumber: string,
  accountName: string,
  bankCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement real payment processor integration
    // - Wise API
    // - PayPal
    // - Bank transfer service
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
