import { apiClient } from './client';

export type Setting = {
  key: string;
  value: string;
  type: string;
  description: string | null;
};

export async function listSettings(): Promise<Setting[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Setting[] }>('/settings');
  return data.data;
}

export async function getSetting(key: string): Promise<Setting> {
  const { data } = await apiClient.get<{ success: boolean; data: Setting }>(`/settings/${key}`);
  return data.data;
}

export async function updateSetting(key: string, value: string): Promise<Setting> {
  const { data } = await apiClient.put<{ success: boolean; data: Setting }>(`/settings/${key}`, { value });
  return data.data;
}

export async function createSetting(key: string, value: string, type = 'STRING', description = ''): Promise<Setting> {
  const { data } = await apiClient.post<{ success: boolean; data: Setting }>('/settings', { key, value, type, description });
  return data.data;
}
