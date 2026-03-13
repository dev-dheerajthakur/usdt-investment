import { api } from "./api";

/**
 * CREATE INVESTMENT
 */
export async function createInvestment(payload: InvestmentPayload) {
  return await api.POST<InvestmentData>('investment/create', payload);
}
/**
 * GET ALL INVESTMENT
 */
export async function getAllInvestment() {
  return await api.GET<InvestmentData[]>('investment/all');
}
/**
 * GET AVAILABLE UNITS
 */
export async function getAvailableUnits() {
  return await api.GET<string>('investment/available-units');
}
