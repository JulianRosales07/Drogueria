import { apiClient } from './client';

export type ProductUnit = {
  id: string;
  productId: string;
  name: string;
  factor: number;
  cost: number;
  price: number;
  barcode: string | null;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  units: ProductUnit[];
};

export type CreateProductUnitInput = {
  name: string;
  factor: number;
  cost: number;
  price: number;
  barcode?: string | null;
};

export type UpdateProductUnitInput = Partial<CreateProductUnitInput>;

export type Category = {
  id: string;
  name: string;
  description: string | null;
};

export type CreateProductInput = {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string | null;
  cost: number;
  price: number;
  minStock?: number;
  isActive?: boolean;
  initialStock?: number;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export async function listProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Product[] }>('/products');
  return data.data;
}

export async function listLowStockProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Product[] }>('/products/low-stock');
  return data.data;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await apiClient.post<{ success: boolean; data: Product }>('/products', input);
  return data.data;
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const { data } = await apiClient.put<{ success: boolean; data: Product }>(`/products/${id}`, input);
  return data.data;
}

export async function adjustProductStock(id: string, stock: number, note?: string): Promise<Product> {
  const { data } = await apiClient.put<{ success: boolean; data: Product }>(`/products/${id}/stock`, {
    stock,
    note,
  });
  return data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function listProductUnits(productId: string): Promise<ProductUnit[]> {
  const { data } = await apiClient.get<{ success: boolean; data: ProductUnit[] }>(
    `/products/${productId}/units`,
  );
  return data.data;
}

export async function createProductUnit(
  productId: string,
  input: CreateProductUnitInput,
): Promise<ProductUnit> {
  const { data } = await apiClient.post<{ success: boolean; data: ProductUnit }>(
    `/products/${productId}/units`,
    input,
  );
  return data.data;
}

export async function updateProductUnit(
  unitId: string,
  input: UpdateProductUnitInput,
): Promise<ProductUnit> {
  const { data } = await apiClient.put<{ success: boolean; data: ProductUnit }>(
    `/products/units/${unitId}`,
    input,
  );
  return data.data;
}

export async function deleteProductUnit(unitId: string): Promise<void> {
  await apiClient.delete(`/products/units/${unitId}`);
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Category[] }>('/products/categories');
  return data.data;
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await apiClient.post<{ success: boolean; data: Category }>('/products/categories', {
    name,
  });
  return data.data;
}
