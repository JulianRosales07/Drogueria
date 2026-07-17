import {
  createProduct,
  createProductUnit,
  listCategories,
  createCategory,
} from '../api/products'
import type { ParsedProductRow } from './inventoryTemplate'

export type ImportOutcome = {
  rowNumber: number
  sku: string
  status: 'created' | 'error'
  message?: string
}

export type ImportSummary = {
  created: number
  failed: number
  outcomes: ImportOutcome[]
}

/**
 * Importa filas de productos ya parseadas y validadas del Excel.
 * Crea categorías nuevas sobre la marcha (cacheadas por nombre) y,
 * por cada producto, sus presentaciones adicionales si trae.
 * Continúa con las siguientes filas aunque una falle (no aborta todo el lote).
 */
export async function importInventoryRows(
  rows: ParsedProductRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const existingCategories = await listCategories()
  const categoryCache = new Map<string, string>(
    existingCategories.map((c) => [c.name.trim().toLowerCase(), c.id]),
  )

  const outcomes: ImportOutcome[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      let categoryId: string | null = null

      if (row.categoryName) {
        const key = row.categoryName.trim().toLowerCase()
        if (categoryCache.has(key)) {
          categoryId = categoryCache.get(key)!
        } else {
          const created = await createCategory(row.categoryName.trim())
          categoryCache.set(key, created.id)
          categoryId = created.id
        }
      }

      const product = await createProduct({
        sku: row.sku,
        barcode: row.barcode || undefined,
        name: row.name,
        description: row.description || undefined,
        categoryId,
        cost: row.cost,
        price: row.price,
        minStock: row.minStock,
        isActive: row.isActive,
        initialStock: row.initialStock,
      })

      for (const presentation of row.presentations) {
        await createProductUnit(product.id, {
          name: presentation.name,
          factor: presentation.factor,
          price: presentation.price,
          barcode: presentation.barcode || undefined,
        })
      }

      outcomes.push({ rowNumber: row.rowNumber, sku: row.sku, status: 'created' })
    } catch (error: any) {
      outcomes.push({
        rowNumber: row.rowNumber,
        sku: row.sku,
        status: 'error',
        message: error.response?.data?.message || error.message || 'Error desconocido',
      })
    }

    onProgress?.(i + 1, rows.length)
  }

  return {
    created: outcomes.filter((o) => o.status === 'created').length,
    failed: outcomes.filter((o) => o.status === 'error').length,
    outcomes,
  }
}
