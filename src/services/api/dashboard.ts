import { apiClient } from './client';

export type DashboardSummary = {
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    sales: number;
    purchases: number;
  };
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
