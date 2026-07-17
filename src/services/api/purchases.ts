import { apiClient } from './client';

export type PurchaseItemInput = {
  productId: string;
  quantity: number;
  unitCost: number;
  unitFactor?: number;
  unitLabel?: string;
  productUnitId?: string | null;
};

export type CreatePurchaseInput = {
  supplierId: string;
  invoiceNumber?: string;
  notes?: string;
  tax?: number;
  items: PurchaseItemInput[];
};

export type Purchase = {
  id: string;
  supplier_id: string;
  user_id: string;
  invoice_number: string | null;
  notes: string | null;
  tax: number;
  total: number;
  status: string;
  created_at: string;
  suppliers?: { business_name: string } | null;
  purchase_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
    unit_label: string;
    unit_factor: number;
    unit_quantity: number;
    products: { name: string };
  }>;
};

export async function listPurchases(): Promise<Purchase[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Purchase[] }>('/purchases');
  return data.data;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const { data } = await apiClient.post<{ success: boolean; data: Purchase }>('/purchases', input);
  return data.data;
}
