import { apiClient } from './client';

export type StoreRecord = {
  id: string;
  name: string;
  nit: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreInput = {
  name: string;
  nit?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type UpdateStoreInput = Partial<CreateStoreInput> & {
  isActive?: boolean;
};

export async function listStores(): Promise<StoreRecord[]> {
  const { data } = await apiClient.get<{ success: boolean; data: StoreRecord[] }>('/stores');
  return data.data;
}

export async function getStoreById(id: string): Promise<StoreRecord> {
  const { data } = await apiClient.get<{ success: boolean; data: StoreRecord }>(`/stores/${id}`);
  return data.data;
}

export async function createStore(input: CreateStoreInput): Promise<StoreRecord> {
  const { data } = await apiClient.post<{ success: boolean; data: StoreRecord }>('/stores', input);
  return data.data;
}

export async function updateStore(id: string, input: UpdateStoreInput): Promise<StoreRecord> {
  const { data } = await apiClient.put<{ success: boolean; data: StoreRecord }>(`/stores/${id}`, input);
  return data.data;
}

export async function deleteStore(id: string): Promise<void> {
  await apiClient.delete(`/stores/${id}`);
}
