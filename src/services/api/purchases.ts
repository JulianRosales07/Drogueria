import { apiClient } from './client';
import type { PaymentMethod } from './sales';

export type PurchasePaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';

export const PURCHASE_PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  PAID: 'Pagada',
  PARTIAL: 'Pago parcial',
  PENDING: 'Pendiente',
};

export type PurchaseItemInput = {
  productId?: string | null;
  customName?: string | null;
  quantity: number;
  unitCost: number;
  unitFactor?: number;
  unitLabel?: string;
  productUnitId?: string | null;
  /**
   * Precio de venta a aplicar al producto (o a la presentación comprada).
   * Si se omite o va null, el precio de venta no se toca.
   */
  salePrice?: number | null;
};

export type CreatePurchaseInput = {
  supplierId?: string | null;
  invoiceNumber?: string;
  notes?: string;
  tax?: number;
  items: PurchaseItemInput[];
  paymentStatus?: PurchasePaymentStatus;
  paymentMethod?: PaymentMethod;
  isExternal?: boolean;
  amountPaid?: number;
};

export type UpdatePurchaseInput = CreatePurchaseInput;

export type SupplierPayment = {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  note: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  supplier_id?: string | null;
  user_id: string;
  invoice_number: string | null;
  notes: string | null;
  tax: number;
  total: number;
  status: string;
  payment_status: PurchasePaymentStatus;
  payment_method?: PaymentMethod;
  is_external?: boolean;
  amount_paid: number;
  created_at: string;
  subtotal: number;
  suppliers?: { business_name: string } | null;
  users?: { full_name: string } | null;
  purchase_items?: Array<{
    id: string;
    product_id?: string | null;
    custom_name?: string | null;
    product_unit_id: string | null;
    quantity: number;
    unit_cost: number;
    line_total: number;
    unit_label: string;
    unit_factor: number;
    unit_quantity: number;
    sale_price: number | null;
    products?: { name: string; sku?: string } | null;
  }>;
  supplier_payments?: SupplierPayment[];
};

export type SupplierOutstanding = {
  supplierId: string;
  supplierName: string;
  balance: number;
  purchaseCount: number;
};

export async function listPurchases(): Promise<Purchase[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Purchase[] }>('/purchases');
  return data.data;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const { data } = await apiClient.post<{ success: boolean; data: Purchase }>('/purchases', input);
  return data.data;
}

export async function updatePurchase(
  purchaseId: string,
  input: UpdatePurchaseInput,
): Promise<Purchase> {
  const { data } = await apiClient.put<{ success: boolean; data: Purchase }>(
    `/purchases/${purchaseId}`,
    input,
  );
  return data.data;
}

export async function listOutstandingBySupplier(): Promise<SupplierOutstanding[]> {
  const { data } = await apiClient.get<{ success: boolean; data: SupplierOutstanding[] }>(
    '/purchases/outstanding-by-supplier',
  );
  return data.data;
}

export async function registerSupplierPayment(
  purchaseId: string,
  input: { amount: number; paymentMethod?: PaymentMethod; note?: string },
): Promise<Purchase> {
  const { data } = await apiClient.post<{ success: boolean; data: Purchase }>(
    `/purchases/${purchaseId}/payments`,
    input,
  );
  return data.data;
}
