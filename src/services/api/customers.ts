import { apiClient } from './client';

export type Customer = {
  id: string;
  code: string;
  fullName: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerInput = {
  code: string;
  fullName: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function listCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Customer[] }>('/customers');
  return data.data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data } = await apiClient.post<{ success: boolean; data: Customer }>('/customers', input);
  return data.data;
}

export async function updateCustomer(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
  const { data } = await apiClient.put<{ success: boolean; data: Customer }>(`/customers/${id}`, input);
  return data.data;
}
