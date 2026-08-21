import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { listSuppliers } from '../../../services/api/suppliers'
import { listProducts, type Product } from '../../../services/api/products'
import { ProductFormModal } from '../../inventory/components/ProductFormModal'
import {
  createPurchase,
  updatePurchase,
  type Purchase,
  type PurchaseItemInput,
  type PurchasePaymentStatus,
  PURCHASE_PAYMENT_STATUS_LABELS,
} from '../../../services/api/purchases'

type PurchaseFormModalProps = {
  open: boolean
  /** Si viene una compra, el modal trabaja en modo edición */
  purchase?: Purchase | null
  onClose: () => void
}

/**
 * Línea de la compra. Se guarda el nombre del producto además del id para poder
 * editar compras cuyos productos ya no estén en el listado activo.
 *
 * `salePrice` es el precio de venta que quedará en el producto/presentación:
 * viene precargado con el precio actual y si se deja vacío no se modifica.
 */
type LineItem = {
  productId: string
  productName: string
  productSku: string
  unitId: string | null
  unitName: string
  unitFactor: number
  quantity: number
  cost: number
  salePrice: string
}

type PresentationOption = {
  id: string | null
  name: string
  factor: number
  price: number
  cost: number
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Presentaciones disponibles de un producto (la "Unidad" base siempre existe) */
function buildPresentations(product: Product): PresentationOption[] {
  return [
    { id: null, name: 'Unidad', factor: 1, price: product.price, cost: product.cost },
    ...product.units.map((u) => ({
      id: u.id,
      name: u.name,
      factor: u.factor,
      price: u.price,
      cost: u.cost || product.cost * u.factor,
    })),
  ]
}

export function PurchaseFormModal({ open, purchase, onClose }: PurchaseFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(purchase)

  // Datos generales de la compra
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [tax, setTax] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('PAID')
  const [amountPaid, setAmountPaid] = useState(0)

  const [items, setItems] = useState<LineItem[]>([])

  // Buscador / selección del producto a agregar
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<PresentationOption | null>(null)
  const [itemCost, setItemCost] = useState(0)
  const [itemSalePrice, setItemSalePrice] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)

  // Crear un producto que no existe sin perder la compra en curso
  const [productModalOpen, setProductModalOpen] = useState(false)

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
    enabled: open,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
    enabled: open,
  })

  const suppliers = suppliersQuery.data ?? []
  const products = productsQuery.data ?? []

  const resetItemDraft = () => {
    setSelectedProduct(null)
    setSelectedUnit(null)
    setItemCost(0)
    setItemSalePrice('')
    setItemQuantity(1)
  }

  // Precarga del formulario: compra existente (edición) o formulario limpio
  useEffect(() => {
    if (!open) return

    if (purchase) {
      setSelectedSupplierId(purchase.supplier_id)
      setInvoiceNumber(purchase.invoice_number ?? '')
      setNotes(purchase.notes ?? '')
      setTax(Number(purchase.tax) || 0)
      setPaymentStatus(purchase.payment_status)
      setAmountPaid(Number(purchase.amount_paid) || 0)
      setItems(
        (purchase.purchase_items ?? []).map((item) => ({
          productId: item.product_id,
          productName: item.products?.name ?? 'Producto eliminado',
          productSku: item.products?.sku ?? '',
          unitId: item.product_unit_id,
          unitName: item.unit_label || 'Unidad',
          unitFactor: Number(item.unit_factor) || 1,
          quantity: Number(item.unit_quantity) || 1,
          cost: Number(item.unit_cost) || 0,
          // Vacío = no tocar el precio de venta actual del producto
          salePrice: item.sale_price !== null && item.sale_price !== undefined ? String(item.sale_price) : '',
        })),
      )
    } else {
      setSelectedSupplierId('')
      setInvoiceNumber('')
      setNotes('')
      setTax(0)
      setPaymentStatus('PAID')
      setAmountPaid(0)
      setItems([])
    }

    setSearchQuery('')
    resetItemDraft()
    // Solo al abrir o al cambiar de compra: así refrescar el listado de
    // productos (por ejemplo al crear uno nuevo) no descarta lo ya capturado
  }, [open, purchase])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return products
      .filter((p) => p.isActive)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      )
      .slice(0, 5)
  }, [products, searchQuery])

  const presentationOptions = useMemo(
    () => (selectedProduct ? buildPresentations(selectedProduct) : []),
    [selectedProduct],
  )

  /** Precio de venta vigente de una línea, para mostrarlo como referencia */
  const currentPriceOf = (item: LineItem): number | null => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return null
    if (!item.unitId) return product.price
    return product.units.find((u) => u.id === item.unitId)?.price ?? null
  }

  const handleSelectProduct = (product: Product) => {
    const options = buildPresentations(product)
    const base = options[0]!
    setSelectedProduct(product)
    setSearchQuery('')
    setSelectedUnit(base)
    setItemCost(base.cost)
    setItemSalePrice(String(base.price ?? ''))
    setItemQuantity(1)
  }

  const handleUnitChange = (unitId: string | null) => {
    const opt = presentationOptions.find((o) => o.id === unitId)
    if (!opt) return
    setSelectedUnit(opt)
    setItemCost(opt.cost)
    setItemSalePrice(String(opt.price ?? ''))
  }

  const handleAddItem = () => {
    if (!selectedProduct || !selectedUnit) return

    if (itemQuantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    if (itemCost < 0) {
      toast.error('El costo no puede ser negativo')
      return
    }

    const existingIndex = items.findIndex(
      (it) => it.productId === selectedProduct.id && it.unitId === selectedUnit.id,
    )

    if (existingIndex > -1) {
      setItems((current) =>
        current.map((it, i) =>
          i === existingIndex
            ? { ...it, quantity: it.quantity + itemQuantity, cost: itemCost, salePrice: itemSalePrice }
            : it,
        ),
      )
    } else {
      setItems((current) => [
        ...current,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productSku: selectedProduct.sku,
          unitId: selectedUnit.id,
          unitName: selectedUnit.name,
          unitFactor: selectedUnit.factor,
          quantity: itemQuantity,
          cost: itemCost,
          salePrice: itemSalePrice,
        },
      ])
    }

    resetItemDraft()
    toast.success('Producto agregado a la lista')
  }

  const updateItem = (index: number, changes: Partial<LineItem>) => {
    setItems((current) => current.map((it, i) => (i === index ? { ...it, ...changes } : it)))
  }

  const handleRemoveItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index))
  }

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.cost, 0),
    [items],
  )
  const total = useMemo(() => subtotal + tax, [subtotal, tax])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplierId) {
        throw new Error('Debes seleccionar un proveedor')
      }
      if (items.length === 0) {
        throw new Error('La lista de compra está vacía')
      }
      if (items.some((it) => it.quantity <= 0)) {
        throw new Error('Todas las cantidades deben ser mayores a 0')
      }
      if (paymentStatus === 'PARTIAL' && (amountPaid <= 0 || amountPaid >= total)) {
        throw new Error('El monto abonado debe ser mayor a 0 y menor al total para un pago parcial')
      }

      const purchaseItems: PurchaseItemInput[] = items.map((it) => {
        const parsedPrice = it.salePrice.trim() === '' ? null : Number(it.salePrice)
        return {
          productId: it.productId,
          quantity: Number(it.quantity),
          unitCost: Number(it.cost),
          unitFactor: it.unitFactor,
          unitLabel: it.unitName,
          productUnitId: it.unitId,
          salePrice: parsedPrice !== null && parsedPrice > 0 ? parsedPrice : null,
        }
      })

      const payload = {
        supplierId: selectedSupplierId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        tax: Number(tax) || 0,
        items: purchaseItems,
        paymentStatus,
        amountPaid: paymentStatus === 'PARTIAL' ? Number(amountPaid) : undefined,
      }

      return isEditing && purchase
        ? updatePurchase(purchase.id, payload)
        : createPurchase(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-by-supplier'] })
      toast.success(
        isEditing
          ? 'Compra actualizada (inventario y precios ajustados)'
          : 'Compra registrada correctamente (stock actualizado)',
      )
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Error al guardar la compra')
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] sm:max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? '✏️ Editar Compra' : '🛒 Registrar Entrada de Compra / Mercancía'}
            </h2>
            {isEditing && (
              <p className="mt-0.5 text-xs text-slate-400">
                Factura {purchase?.invoice_number || 'S/N'} · Al guardar se ajusta el inventario por la
                diferencia de cantidades
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-4 sm:p-6 grid-cols-1 md:grid-cols-[1fr_1.8fr]">
          {/* Panel izquierdo: datos generales */}
          <div className="space-y-4 border-slate-200 pr-0 dark:border-slate-800 md:border-r md:pr-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Datos de Proveedor e Impuestos
            </h3>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Proveedor *
              </span>
              <select
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                <option value="">Selecciona un proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Número de Factura
              </span>
              <input
                placeholder="Ej: FAC-1004"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Otros Costos / Impuesto (IVA)
              </span>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={tax || ''}
                onChange={(e) => setTax(Number(e.target.value))}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Estado de pago al proveedor
              </span>
              <select
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PurchasePaymentStatus)}
              >
                {(Object.keys(PURCHASE_PAYMENT_STATUS_LABELS) as PurchasePaymentStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {PURCHASE_PAYMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            {paymentStatus === 'PARTIAL' && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Monto abonado
                </span>
                <input
                  type="number"
                  min="0"
                  max={total}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Saldo pendiente: {money(Math.max(total - amountPaid, 0))}
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Notas
              </span>
              <textarea
                rows={3}
                placeholder="Observaciones de la entrada..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold">{money(subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-slate-500">Impuestos/Otros:</span>
                <span className="font-semibold">{money(tax)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Total:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{money(total)}</span>
              </div>
            </div>
          </div>

          {/* Panel derecho: productos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Productos de la compra
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                + Crear producto nuevo
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, SKU o código de barras..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {filteredProducts.length > 0 && (
                <ul className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  {filteredProducts.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                      >
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-slate-400">SKU: {p.sku}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">Stock: {p.stock} base</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Detalle del producto seleccionado */}
            {selectedProduct && selectedUnit && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-800 dark:bg-blue-900/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                      {selectedProduct.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      SKU: {selectedProduct.sku} · Precio actual: {money(selectedUnit.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetItemDraft}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                      Presentación
                    </span>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={selectedUnit.id || ''}
                      onChange={(e) => handleUnitChange(e.target.value || null)}
                    >
                      {presentationOptions.map((opt) => (
                        <option key={opt.id || ''} value={opt.id || ''}>
                          {opt.name} (x{opt.factor})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                      Cantidad
                    </span>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                      Costo Unitario
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={itemCost}
                      onChange={(e) => setItemCost(Number(e.target.value))}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
                      Precio de venta
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sin cambio"
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={itemSalePrice}
                      onChange={(e) => setItemSalePrice(e.target.value)}
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de productos agregados */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Presentación</th>
                    <th className="p-3">Cantidad</th>
                    <th className="p-3">Costo</th>
                    <th className="p-3">Nuevo Precio Venta</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((item, index) => (
                    <tr key={`${item.productId}-${item.unitId ?? 'base'}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                        {item.productSku && (
                          <p className="text-[10px] text-slate-400">SKU: {item.productSku}</p>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {item.unitName}
                        {item.unitFactor > 1 && (
                          <span className="text-[10px] text-slate-400"> (x{item.unitFactor})</span>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          className="w-16 rounded border border-slate-200 bg-white px-2 py-1 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          className="w-20 rounded border border-slate-200 bg-white px-2 py-1 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          value={item.cost}
                          onChange={(e) => updateItem(index, { cost: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          placeholder="Sin cambio"
                          className="w-24 rounded border border-slate-200 bg-white px-2 py-1 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
                          value={item.salePrice}
                          onChange={(e) => updateItem(index, { salePrice: e.target.value })}
                        />
                        {currentPriceOf(item) !== null && (
                          <span className="ml-1.5 text-[10px] text-slate-400">
                            Actual: {money(currentPriceOf(item)!)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {money(item.quantity * item.cost)}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Ningún producto agregado a la orden de compra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400">
              El precio de venta se aplica al producto (o a la presentación) al guardar la compra. Déjalo
              vacío para no modificarlo.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || items.length === 0 || !selectedSupplierId}
            className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 text-center"
          >
            {saveMutation.isPending
              ? 'Procesando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Registrar Compra'}
          </button>
        </div>
      </div>

      {/* Se monta al final para quedar por encima del modal de compra */}
      <ProductFormModal open={productModalOpen} onClose={() => setProductModalOpen(false)} />
    </div>
  )
}
