import { apiClient } from './client';

export type SaleItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitFactor?: number;
  unitLabel?: string;
  productUnitId?: string;
};

export type CreateSaleInput = {
  customerId?: string;
  customerName?: string;   // Nombre libre (se guarda en notes si no hay customerId)
  notes?: string;
  tax?: number;
  discount?: number;
  items: SaleItem[];
};

export type Sale = {
  id: string;
  customer_id: string | null;
  user_id: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  created_at: string;
  customers?: { full_name: string } | null;
  users?: { full_name: string } | null;
  sale_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    unit_label: string;
    unit_factor: number;
    unit_quantity: number;
    products: { name: string };
  }>;
};

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const { data } = await apiClient.post<{ success: boolean; data: Sale }>('/sales', input);
  return data.data;
}

export async function listSales(userId?: string): Promise<Sale[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Sale[] }>('/sales', {
    params: userId ? { userId } : undefined,
  });
  return data.data;
}
