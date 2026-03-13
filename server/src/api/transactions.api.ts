import { api } from "./api";

/**
 * GET ALL TRANSACTIONS
 */
export async function getAllTransactions() {
  return await api.GET<TransactionData>('transactions/all');
}