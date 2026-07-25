import { apiClient } from './client';

/** Rentabilidad de un periodo: Utilidad = Ventas - Costo de lo vendido (COGS) */
export type ProfitSummary = {
  salesTotal: number;
  cogs: number;
  profit: number;
  salesCount: number;
  purchasesTotal: number;
};

export type ProfitDay = {
  day: string;
  salesTotal: number;
  cogs: number;
  profit: number;
};

export type DashboardSummary = {
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    sales: number;
    purchases: number;
  };
  /** Indicadores del día de hoy (ventas, costo y utilidad real) */
  today: ProfitSummary;
  /** Serie de los últimos días para los gráficos */
  profitDaily: ProfitDay[];
  recentSales: Array<{
    id: string;
    total: number;
    created_at: string;
    customers?: { full_name: string } | null;
  }>;
  recentPurchases: Array<{
    id: string;
    total: number;
    created_at: string;
    suppliers?: { business_name: string } | null;
  }>;
  lowStock: Array<{
    id: string;
    sku: string;
    name: string;
    stock: number;
    min_stock: number;
  }>;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<{ success: boolean; data: DashboardSummary }>('/dashboard/summary');
  return data.data;
}

/**
 * Rentabilidad de un rango de fechas (YYYY-MM-DD). Sin parámetros devuelve hoy.
 */
export async function getProfitSummary(from?: string, to?: string): Promise<ProfitSummary> {
  const { data } = await apiClient.get<{ success: boolean; data: ProfitSummary }>('/dashboard/profit', {
    params: { from, to },
  });
  return data.data;
}

export async function getProfitDaily(days = 14): Promise<ProfitDay[]> {
  const { data } = await apiClient.get<{ success: boolean; data: ProfitDay[] }>('/dashboard/profit/daily', {
    params: { days },
  });
  return data.data;
}
