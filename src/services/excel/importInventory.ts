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
 * Optimizado con pre-creación de categorías y concurrencia por lotes (5 productos en paralelo)
 * para reducir drásticamente el tiempo total de importación.
 */
export async function importInventoryRows(
  rows: ParsedProductRow[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 5,
): Promise<ImportSummary> {
  onProgress?.(0, rows.length)

  // 1. Pre-cargar categorías existentes
  const existingCategories = await listCategories()
  const categoryCache = new Map<string, string>(
    existingCategories.map((c) => [c.name.trim().toLowerCase(), c.id]),
  )

  // 2. Pre-crear todas las categorías únicas faltantes una sola vez
  const uniqueCategoryNames = Array.from(
    new Set(
      rows
        .map((r) => r.categoryName?.trim())
        .filter((name): name is string => Boolean(name && name.length > 0)),
    ),
  )

  for (const catName of uniqueCategoryNames) {
    const key = catName.toLowerCase()
    if (!categoryCache.has(key)) {
      try {
        const created = await createCategory(catName)
        categoryCache.set(key, created.id)
      } catch {
        // Si ya existía o falla, continuar
      }
    }
  }

  // 3. Procesar filas con concurrencia controlada
  const outcomes: ImportOutcome[] = new Array(rows.length)
  let doneCount = 0
  let currentIndex = 0

  async function worker() {
    while (currentIndex < rows.length) {
      const idx = currentIndex++
      const row = rows[idx]
      try {
        let categoryId: string | null = null
        if (row.categoryName) {
          const key = row.categoryName.trim().toLowerCase()
          categoryId = categoryCache.get(key) || null
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

        if (row.presentations && row.presentations.length > 0) {
          for (const presentation of row.presentations) {
            await createProductUnit(product.id, {
              name: presentation.name,
              factor: presentation.factor,
              cost: presentation.cost,
              price: presentation.price,
              barcode: presentation.barcode || undefined,
            })
          }
        }

        outcomes[idx] = { rowNumber: row.rowNumber, sku: row.sku, status: 'created' }
      } catch (error: any) {
        outcomes[idx] = {
          rowNumber: row.rowNumber,
          sku: row.sku,
          status: 'error',
          message: error.response?.data?.message || error.message || 'Error desconocido',
        }
      } finally {
        doneCount++
        onProgress?.(doneCount, rows.length)
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, rows.length) },
    () => worker(),
  )
  await Promise.all(workers)

  return {
    created: outcomes.filter((o) => o && o.status === 'created').length,
    failed: outcomes.filter((o) => o && o.status === 'error').length,
    outcomes: outcomes.filter(Boolean),
  }
}
