import { apiClient } from './client';

export type UserRecord = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  status: string;
  roleId: string;
  roleName: string | null;
  storeId: string | null;
  storeName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleRecord = {
  id: string;
  name: string;
};

export type CreateUserInput = {
  email: string;
  username: string;
  fullName: string;
  password?: string;
  roleId: string;
  storeId?: string | null;
  status?: string;
};

export type UpdateUserInput = Partial<CreateUserInput>;

export async function listUsers(): Promise<UserRecord[]> {
  const { data } = await apiClient.get<{ success: boolean; data: UserRecord[] }>('/users');
  return data.data;
}

/** Lista el personal (cajeros, etc.) de la propia droguería. Solo para Administrador de Drogueria. */
export async function listStoreStaff(): Promise<UserRecord[]> {
  const { data } = await apiClient.get<{ success: boolean; data: UserRecord[] }>('/users/store/staff');
  return data.data;
}

export async function getRoles(): Promise<RoleRecord[]> {
  const { data } = await apiClient.get<{ success: boolean; data: RoleRecord[] }>('/users/roles');
  return data.data;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const { data } = await apiClient.post<{ success: boolean; data: UserRecord }>('/users', input);
  return data.data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserRecord> {
  const { data } = await apiClient.put<{ success: boolean; data: UserRecord }>(`/users/${id}`, input);
  return data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
