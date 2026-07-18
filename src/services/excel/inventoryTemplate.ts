import * as XLSX from 'xlsx'

export const TEMPLATE_HEADERS = [
  'SKU',
  'CodigoBarras',
  'Nombre',
  'Descripcion',
  'Categoria',
  'Costo',
  'PrecioVenta',
  'StockInicial',
  'StockMinimo',
  'Activo',
  'Presentacion1_Nombre',
  'Presentacion1_Unidades',
  'Presentacion1_Costo',
  'Presentacion1_Precio',
  'Presentacion1_CodigoBarras',
  'Presentacion2_Nombre',
  'Presentacion2_Unidades',
  'Presentacion2_Costo',
  'Presentacion2_Precio',
  'Presentacion2_CodigoBarras',
  'Presentacion3_Nombre',
  'Presentacion3_Unidades',
  'Presentacion3_Costo',
  'Presentacion3_Precio',
  'Presentacion3_CodigoBarras',
] as const

export type ParsedProductRow = {
  rowNumber: number
  sku: string
  barcode: string
  name: string
  description: string
  categoryName: string
  cost: number
  price: number
  initialStock: number
  minStock: number
  isActive: boolean
  presentations: Array<{ name: string; factor: number; cost: number; price: number; barcode: string }>
}

export type ParseResult = {
  rows: ParsedProductRow[]
  errors: Array<{ rowNumber: number; message: string }>
}

/**
 * Genera y descarga la plantilla de Excel para importar inventario,
 * con encabezados, una fila de ejemplo y una hoja de instrucciones.
 */
export function downloadInventoryTemplate() {
  const exampleRows = [
    {
      SKU: 'MED-001',
      CodigoBarras: '7701234560012',
      Nombre: 'Acetaminofén 500mg',
      Descripcion: 'Caja x 20 tabletas',
      Categoria: 'Analgésicos',
      Costo: 5000,
      PrecioVenta: 8000,
      StockInicial: 50,
      StockMinimo: 10,
      Activo: 'Si',
      Presentacion1_Nombre: 'Caja x10',
      Presentacion1_Unidades: 10,
      Presentacion1_Costo: 50000,
      Presentacion1_Precio: 70000,
      Presentacion1_CodigoBarras: '7701234560029',
      Presentacion2_Nombre: 'Media caja',
      Presentacion2_Unidades: 10,
      Presentacion2_Costo: 50000,
      Presentacion2_Precio: 70000,
      Presentacion2_CodigoBarras: '7701234560036',
      Presentacion3_Nombre: 'Caja completa',
      Presentacion3_Unidades: 20,
      Presentacion3_Costo: 100000,
      Presentacion3_Precio: 130000,
      Presentacion3_CodigoBarras: '7701234560043',
    },
    {
      SKU: 'MED-002',
      CodigoBarras: '7701234560050',
      Nombre: 'Ibuprofeno 400mg',
      Descripcion: '',
      Categoria: 'Analgésicos',
      Costo: 3000,
      PrecioVenta: 5000,
      StockInicial: 30,
      StockMinimo: 5,
      Activo: 'Si',
      Presentacion1_Nombre: '',
      Presentacion1_Unidades: '',
      Presentacion1_Costo: '',
      Presentacion1_Precio: '',
      Presentacion1_CodigoBarras: '',
      Presentacion2_Nombre: '',
      Presentacion2_Unidades: '',
      Presentacion2_Costo: '',
      Presentacion2_Precio: '',
      Presentacion2_CodigoBarras: '',
      Presentacion3_Nombre: '',
      Presentacion3_Unidades: '',
      Presentacion3_Costo: '',
      Presentacion3_Precio: '',
      Presentacion3_CodigoBarras: '',
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(exampleRows, { header: TEMPLATE_HEADERS as unknown as string[] })
  worksheet['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length, 16) }))

  const instructions = [
    { Campo: 'SKU', Obligatorio: 'Sí', Descripcion: 'Código único del producto. No se puede repetir.' },
    { Campo: 'CodigoBarras', Obligatorio: 'No', Descripcion: 'Código de barras de la unidad base (opcional).' },
    { Campo: 'Nombre', Obligatorio: 'Sí', Descripcion: 'Nombre del producto.' },
    { Campo: 'Descripcion', Obligatorio: 'No', Descripcion: 'Descripción adicional.' },
    { Campo: 'Categoria', Obligatorio: 'No', Descripcion: 'Si no existe, se crea automáticamente.' },
    { Campo: 'Costo', Obligatorio: 'Sí', Descripcion: 'Costo de compra por unidad (número).' },
    { Campo: 'PrecioVenta', Obligatorio: 'Sí', Descripcion: 'Precio de venta por unidad (número).' },
    { Campo: 'StockInicial', Obligatorio: 'No', Descripcion: 'Cantidad inicial en unidades (default 0).' },
    { Campo: 'StockMinimo', Obligatorio: 'No', Descripcion: 'Cantidad mínima antes de alertar (default 0).' },
    { Campo: 'Activo', Obligatorio: 'No', Descripcion: 'Si / No. Default Si. Los inactivos no aparecen en el POS.' },
    {
      Campo: 'Presentacion1_* / Presentacion2_* / Presentacion3_*',
      Obligatorio: 'No',
      Descripcion:
        'Hasta 3 presentaciones adicionales además de la Unidad (ej. Caja x10, Media caja, Caja completa). Unidades debe ser mayor a 1. Deja las 5 columnas vacías si no aplica.',
    },
  ]
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions)
  instructionsSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 70 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones')

  XLSX.writeFile(workbook, 'plantilla_inventario.xlsx')
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === '') return true // default: activo
  return !['no', 'false', '0', 'n'].includes(normalized)
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  const parsed = parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Lee un archivo .xlsx/.xls y devuelve las filas de productos parseadas,
 * junto con errores de validación básica (fila por fila, sin abortar todo el archivo).
 */
export async function parseInventoryFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames.includes('Productos') ? 'Productos' : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const rows: ParsedProductRow[] = []
  const errors: Array<{ rowNumber: number; message: string }> = []
  const seenSkus = new Set<string>()

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2 // +1 por índice base 0, +1 por la fila de encabezado
    const sku = String(raw.SKU ?? '').trim()
    const name = String(raw.Nombre ?? '').trim()
    const cost = toNumber(raw.Costo)
    const price = toNumber(raw.PrecioVenta)

    if (!sku && !name) return // fila vacía, se ignora silenciosamente

    if (!sku) {
      errors.push({ rowNumber, message: 'Falta el SKU' })
      return
    }
    if (!name) {
      errors.push({ rowNumber, message: 'Falta el Nombre' })
      return
    }
    if (seenSkus.has(sku.toLowerCase())) {
      errors.push({ rowNumber, message: `SKU duplicado en el archivo: ${sku}` })
      return
    }
    if (!cost || cost < 0) {
      errors.push({ rowNumber, message: 'Costo inválido' })
      return
    }
    if (!price || price < 0) {
      errors.push({ rowNumber, message: 'PrecioVenta inválido' })
      return
    }

    seenSkus.add(sku.toLowerCase())

    const presentations: ParsedProductRow['presentations'] = []
    for (const prefix of ['Presentacion1', 'Presentacion2', 'Presentacion3']) {
      const pName = String(raw[`${prefix}_Nombre`] ?? '').trim()
      const pFactor = toNumber(raw[`${prefix}_Unidades`])
      const pCost = toNumber(raw[`${prefix}_Costo`])
      const pPrice = toNumber(raw[`${prefix}_Precio`])
      const pBarcode = String(raw[`${prefix}_CodigoBarras`] ?? '').trim()

      if (!pName && !pFactor && !pPrice) continue // slot vacío

      if (!pName || pFactor <= 1 || pPrice <= 0 || pCost < 0) {
        errors.push({
          rowNumber,
          message: `${prefix}: debe tener nombre, unidades > 1, costo >= 0 y precio > 0`,
        })
        continue
      }

      presentations.push({ name: pName, factor: pFactor, cost: pCost, price: pPrice, barcode: pBarcode })
    }

    rows.push({
      rowNumber,
      sku,
      barcode: String(raw.CodigoBarras ?? '').trim(),
      name,
      description: String(raw.Descripcion ?? '').trim(),
      categoryName: String(raw.Categoria ?? '').trim(),
      cost,
      price,
      initialStock: Math.max(0, toNumber(raw.StockInicial)),
      minStock: Math.max(0, toNumber(raw.StockMinimo)),
      isActive: toBoolean(raw.Activo),
      presentations,
    })
  })

  return { rows, errors }
}
