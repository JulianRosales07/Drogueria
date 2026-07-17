import { simulateRequest } from '../services/api/client'

export type Metric = {
  label: string
  value: string
  change: string
  tone: 'emerald' | 'blue' | 'violet' | 'amber'
}

export type InventoryItem = {
  id: string
  name: string
  category: string
  stock: number
  minStock: number
  price: number
  supplier: string
  status: 'Disponible' | 'Por vencer' | 'Crítico'
}

export type Customer = {
  id: string
  name: string
  phone: string
  city: string
  loyalty: string
  totalSpent: string
}

export type Supplier = {
  id: string
  name: string
  category: string
  leadTime: string
  balance: string
}

export type Purchase = {
  id: string
  supplier: string
  status: 'Pendiente' | 'Recibida' | 'Parcial'
  total: string
  eta: string
}

export type PosProduct = {
  sku: string
  name: string
  price: number
  stock: number
}

export const dashboardMetrics: Metric[] = [
  { label: 'Ventas del día', value: '$ 3.480.000', change: '+12.4%', tone: 'emerald' },
  { label: 'Tickets atendidos', value: '148', change: '+8.1%', tone: 'blue' },
  { label: 'Inventario crítico', value: '19', change: '-5 productos', tone: 'amber' },
  { label: 'Margen promedio', value: '31.8%', change: '+1.9 pts', tone: 'violet' },
]

export const salesByMonth = [
  { month: 'Ene', sales: 24, purchases: 16 },
  { month: 'Feb', sales: 28, purchases: 17 },
  { month: 'Mar', sales: 26, purchases: 18 },
  { month: 'Abr', sales: 30, purchases: 19 },
  { month: 'May', sales: 35, purchases: 21 },
  { month: 'Jun', sales: 37, purchases: 22 },
]

export const topCategories = [
  { label: 'Medicamentos OTC', value: 38 },
  { label: 'Cuidado personal', value: 24 },
  { label: 'Suplementos', value: 18 },
  { label: 'Fórmulas pediátricas', value: 20 },
]

export const inventory: InventoryItem[] = [
  { id: 'INV-001', name: 'Acetaminofén 500 mg', category: 'Analgésicos', stock: 122, minStock: 40, price: 9500, supplier: 'Salud Total SAS', status: 'Disponible' },
  { id: 'INV-002', name: 'Ibuprofeno 400 mg', category: 'Analgésicos', stock: 37, minStock: 35, price: 12800, supplier: 'Medifarma', status: 'Crítico' },
  { id: 'INV-003', name: 'Vitamina C x 100', category: 'Suplementos', stock: 58, minStock: 25, price: 21900, supplier: 'NutriPlus', status: 'Disponible' },
  { id: 'INV-004', name: 'Loratadina 10 mg', category: 'Antialérgicos', stock: 18, minStock: 20, price: 11400, supplier: 'Salud Total SAS', status: 'Crítico' },
  { id: 'INV-005', name: 'Pañitos húmedos bebé', category: 'Higiene', stock: 41, minStock: 22, price: 7300, supplier: 'BabyCare', status: 'Disponible' },
  { id: 'INV-006', name: 'Protector solar FPS 50', category: 'Dermocosmética', stock: 14, minStock: 18, price: 38900, supplier: 'DermaLab', status: 'Por vencer' },
]

export const customers: Customer[] = [
  { id: 'CLI-001', name: 'Ana María Torres', phone: '310 224 5501', city: 'Bogotá', loyalty: 'Oro', totalSpent: '$ 1.240.000' },
  { id: 'CLI-002', name: 'Carlos Rojas', phone: '315 891 0042', city: 'Soacha', loyalty: 'Plata', totalSpent: '$ 680.000' },
  { id: 'CLI-003', name: 'Laura Pérez', phone: '320 778 1188', city: 'Chía', loyalty: 'Bronce', totalSpent: '$ 342.000' },
  { id: 'CLI-004', name: 'Miguel Castillo', phone: '301 909 6644', city: 'Bogotá', loyalty: 'Oro', totalSpent: '$ 1.910.000' },
]

export const suppliers: Supplier[] = [
  { id: 'PRO-001', name: 'Salud Total SAS', category: 'Medicamentos', leadTime: '24 h', balance: '$ 4.800.000' },
  { id: 'PRO-002', name: 'DermaLab', category: 'Dermocosmética', leadTime: '48 h', balance: '$ 2.300.000' },
  { id: 'PRO-003', name: 'NutriPlus', category: 'Suplementos', leadTime: '72 h', balance: '$ 1.650.000' },
]

export const purchases: Purchase[] = [
  { id: 'OC-2301', supplier: 'Salud Total SAS', status: 'Recibida', total: '$ 2.140.000', eta: 'Hoy' },
  { id: 'OC-2302', supplier: 'NutriPlus', status: 'Pendiente', total: '$ 860.000', eta: 'Mañana' },
  { id: 'OC-2303', supplier: 'DermaLab', status: 'Parcial', total: '$ 1.320.000', eta: '2 días' },
]

export const posProducts: PosProduct[] = [
  { sku: 'POS-101', name: 'Acetaminofén 500 mg', price: 9500, stock: 122 },
  { sku: 'POS-102', name: 'Loratadina 10 mg', price: 11400, stock: 18 },
  { sku: 'POS-103', name: 'Protector solar FPS 50', price: 38900, stock: 14 },
  { sku: 'POS-104', name: 'Vitamina C x 100', price: 21900, stock: 58 },
]

export const reportHighlights = [
  'La venta promedio por ticket subió 6.2% frente a la semana pasada.',
  'Analgésicos y dermocosmética concentran el mayor crecimiento del mes.',
  'Hay 3 productos debajo del mínimo sugerido de compra automática.',
]

export async function fetchDashboardMetrics() {
  return simulateRequest(dashboardMetrics)
}

export async function fetchSalesSeries() {
  return simulateRequest(salesByMonth)
}

export async function fetchTopCategories() {
  return simulateRequest(topCategories)
}

export async function fetchInventory() {
  return simulateRequest(inventory)
}

export async function fetchCustomers() {
  return simulateRequest(customers)
}

export async function fetchSuppliers() {
  return simulateRequest(suppliers)
}

export async function fetchPurchases() {
  return simulateRequest(purchases)
}

export async function fetchPosProducts() {
  return simulateRequest(posProducts)
}

export async function fetchReportHighlights() {
  return simulateRequest(reportHighlights)
}
