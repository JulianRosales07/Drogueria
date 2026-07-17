import { apiClient } from './client';

export type Supplier = {
  id: string;
  code: string;
  businessName: string;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierInput = {
  code: string;
  businessName: string;
  taxId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Supplier[] }>('/suppliers');
  return data.data;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const { data } = await apiClient.post<{ success: boolean; data: Supplier }>('/suppliers', input);
  return data.data;
}

export async function updateSupplier(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
  const { data } = await apiClient.put<{ success: boolean; data: Supplier }>(`/suppliers/${id}`, input);
  return data.data;
}
