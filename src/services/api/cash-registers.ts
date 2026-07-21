import { apiClient } from './client';

export type CashRegister = {
  id: string;
  storeId: string;
  openedByUserId: string;
  openedByName: string | null;
  closedByUserId: string | null;
  closedByName: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  salesTotal: number | null;
  cashSalesTotal: number | null;
  salesCount: number | null;
  openingNote: string | null;
  closingNote: string | null;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
};

export type CurrentCashRegister = CashRegister & {
  salesTotalSoFar: number;
  cashSalesTotalSoFar: number;
  salesCountSoFar: number;
};

export async function getCurrentCashRegister(): Promise<CurrentCashRegister | null> {
  const { data } = await apiClient.get<{ success: boolean; data: CurrentCashRegister | null }>(
    '/cash-registers/current',
  );
  return data.data;
}

export async function listCashRegisterHistory(): Promise<CashRegister[]> {
  const { data } = await apiClient.get<{ success: boolean; data: CashRegister[] }>(
    '/cash-registers/history',
  );
  return data.data;
}

export async function openCashRegister(input: { openingAmount: number; note?: string }): Promise<CashRegister> {
  const { data } = await apiClient.post<{ success: boolean; data: CashRegister }>(
    '/cash-registers/open',
    input,
  );
  return data.data;
}

export async function closeCashRegister(input: { closingAmount: number; note?: string }): Promise<CashRegister> {
  const { data } = await apiClient.post<{ success: boolean; data: CashRegister }>(
    '/cash-registers/close',
    input,
  );
  return data.data;
}
