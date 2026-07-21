import { apiClient } from './client';

export type LoginResponse = {
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: string;
    storeId?: string | null;
    storeName?: string | null;
    storeType?: 'PHARMACY' | 'STORE' | null;
  };
  accessToken: string;
  refreshToken: string;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/login', {
    email,
    password,
  });
  return data.data;
}
