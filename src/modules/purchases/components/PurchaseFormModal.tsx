import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { listSuppliers } from '../../../services/api/suppliers'
import { listProducts, type Product } from '../../../services/api/products'
import {
  createPurchase,
  type PurchaseItemInput,
  type PurchasePaymentStatus,
  PURCHASE_PAYMENT_STATUS_LABELS,
} from '../../../services/api/purchases'

type PurchaseFormModalProps = {
  open: boolean
  onClose: () => void
}

type SelectedItem = {
  product: Product
  selectedUnit: {
    id: string | null
    name: string
    factor: number
    cost: number // default value: product.cost * factor
  }
  quantity: number
  cost: number
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function PurchaseFormModal({ open, onClose }: PurchaseFormModalProps) {
  const queryClient = useQueryClient()

  // Form states
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [tax, setTax] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('PAID')
  const [amountPaid, setAmountPaid] = useState(0)

  // Items state
  const [items, setItems] = useState<SelectedItem[]>([])

  // Search product states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<{ id: string | null; name: string; factor: number; price: number } | null>(null)
  const [itemCost, setItemCost] = useState(0)
  const [itemQuantity, setItemQuantity] = useState(1)

  // Fetch suppliers and products
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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) return
    setSelectedSupplierId('')
    setInvoiceNumber('')
    setNotes('')
    setTax(0)
    setPaymentStatus('PAID')
    setAmountPaid(0)
    setItems([])
    setSearchQuery('')
    setSelectedProduct(null)
    setSelectedUnit(null)
    setItemCost(0)
    setItemQuantity(1)
  }, [open])

  // Filtered products for search autocomplete
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return products
      .filter((p) => p.isActive)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [products, searchQuery])

  // Available presentations for selected product
  const presentationOptions = useMemo(() => {
    if (!selectedProduct) return []
    return [
      { id: null, name: 'Unidad', factor: 1, price: selectedProduct.price, cost: selectedProduct.cost },
      ...selectedProduct.units.map((u) => ({
        id: u.id,
        name: u.name,
        factor: u.factor,
        price: u.price,
        cost: selectedProduct.cost * u.factor, // default cost estimation
      })),
    ]
  }, [selectedProduct])

  // Handle product selection from search
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchQuery('')
    // Default to first unit (Unidad)
    const unit = { id: null, name: 'Unidad', factor: 1, price: product.price }
    setSelectedUnit(unit)
    setItemCost(product.cost)
    setItemQuantity(1)
  };

  const handleUnitChange = (unitId: string | null) => {
    if (!selectedProduct) return
    const opt = presentationOptions.find(o => o.id === unitId)
    if (opt) {
      setSelectedUnit({ id: opt.id, name: opt.name, factor: opt.factor, price: opt.price })
      setItemCost(opt.cost)
    }
  }

  // Add item to buy list
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
      (it) => it.product.id === selectedProduct.id && it.selectedUnit.id === selectedUnit.id
    )

    if (existingIndex > -1) {
      // Update quantity
      const newItems = [...items]
      newItems[existingIndex].quantity += itemQuantity
      setItems(newItems)
    } else {
      setItems([
        ...items,
        {
          product: selectedProduct,
          selectedUnit: {
            id: selectedUnit.id,
            name: selectedUnit.name,
            factor: selectedUnit.factor,
            cost: itemCost,
          },
          quantity: itemQuantity,
          cost: itemCost,
        },
      ])
    }

    // Reset search product state
    setSelectedProduct(null)
    setSelectedUnit(null)
    setItemCost(0)
    setItemQuantity(1)
    toast.success('Producto agregado a la lista')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.cost, 0)
  }, [items])

  const total = useMemo(() => {
    return subtotal + tax
  }, [subtotal, tax])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplierId) {
        throw new Error('Debes seleccionar un proveedor')
      }
      if (items.length === 0) {
        throw new Error('La lista de compra está vacía')
      }
      if (paymentStatus === 'PARTIAL' && (amountPaid <= 0 || amountPaid >= total)) {
        throw new Error('El monto abonado debe ser mayor a 0 y menor al total para un pago parcial')
      }

      const purchaseItems: PurchaseItemInput[] = items.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
        unitCost: it.cost,
        unitFactor: it.selectedUnit.factor,
        unitLabel: it.selectedUnit.name,
        productUnitId: it.selectedUnit.id,
      }))

      return createPurchase({
        supplierId: selectedSupplierId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        tax: Number(tax) || 0,
        items: purchaseItems,
        paymentStatus,
        amountPaid: paymentStatus === 'PARTIAL' ? Number(amountPaid) : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Compra registrada correctamente (stock actualizado)')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.message || 'Error al registrar la compra')
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl dark:bg-slate-900 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            🛒 Registrar Entrada de Compra / Mercancía
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid gap-6 md:grid-cols-[1fr_1.8fr]">
          {/* Left panel: General purchase info */}
          <div className="space-y-4 border-r border-slate-200 pr-0 md:pr-6 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Datos de Proveedor e Impuestos</h3>
            
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
                  Monto abonado ahora
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

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Impuestos/Otros:</span>
                <span className="font-semibold">{money(tax)}</span>
              </div>
              <div className="flex justify-between text-base mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Total:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{money(total)}</span>
              </div>
            </div>
          </div>

          {/* Right panel: Add products & Table */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Buscador y Selección de Productos</h3>

              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre, SKU o código de barras..."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {filteredProducts.length > 0 && (
                  <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg z-10 dark:border-slate-800 dark:bg-slate-900">
                    {filteredProducts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white"
                        >
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-slate-400">SKU: {p.sku}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">
                            Stock: {p.stock} base
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Selected product detail form */}
              {selectedProduct && selectedUnit && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-800 dark:bg-blue-900/10 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-950 dark:text-white">{selectedProduct.name}</h4>
                      <p className="text-xs text-slate-400">SKU: {selectedProduct.sku}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
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

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                      <th className="p-3">Producto</th>
                      <th className="p-3">Presentación</th>
                      <th className="p-3">Cantidad</th>
                      <th className="p-3">Costo</th>
                      <th className="p-3">Subtotal</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="p-3">
                          <p className="font-medium text-slate-900 dark:text-white">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400">SKU: {item.product.sku}</p>
                        </td>
                        <td className="p-3">{item.selectedUnit.name}</td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{money(item.cost)}</td>
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
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Ningún producto agregado a la orden de compra.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || items.length === 0 || !selectedSupplierId}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Procesando...' : 'Registrar Compra'}
          </button>
        </div>
      </div>
    </div>
  )
}
