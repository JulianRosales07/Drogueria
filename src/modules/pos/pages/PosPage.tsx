import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useReactToPrint } from 'react-to-print'
import { Receipt } from '../../../components/Receipt'
import { listProducts, type Product } from '../../../services/api/products'
import { createSale, type Sale } from '../../../services/api/sales'
import { listCustomers } from '../../../services/api/customers'
import { useReceiptConfig } from '../../../hooks/useReceiptConfig'

type CartItem = {
  productId: string
  sku: string
  name: string
  /** Precio de la presentación elegida */
  price: number
  /** Cantidad en la presentación elegida (no en unidades base) */
  quantity: number
  /** Stock disponible en UNIDADES BASE */
  stock: number
  /** Unidades base que representa la presentación elegida (1 = Unidad) */
  unitFactor: number
  /** Nombre de la presentación (Unidad, Caja x10, etc.) */
  unitLabel: string
  /** id de product_units si no es la unidad base */
  productUnitId: string | null
}

type PresentationOption = {
  label: string
  price: number
  factor: number
  productUnitId: string | null
}

function getPresentations(product: Product): PresentationOption[] {
  return [
    { label: 'Unidad', price: product.price, factor: 1, productUnitId: null },
    ...product.units.map((u) => ({
      label: u.name,
      price: u.price,
      factor: u.factor,
      productUnitId: u.id,
    })),
  ]
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function PosPage() {
  const queryClient = useQueryClient()
  const receiptRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const paymentInputRef = useRef<HTMLInputElement>(null)
  const lastCustomerNameRef = useRef<string>('')   // persists across state resets
  const receiptConfig = useReceiptConfig()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
  })

  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true)
  const [ticketNumber, setTicketNumber] = useState(1)
  const [presentationPicker, setPresentationPicker] = useState<Product | null>(null)

  const createSaleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      lastCustomerNameRef.current = customerName.trim()  // save before clearing
      setCompletedSale(sale)
      setLastSale(sale)
      setShowReceipt(true)
      setCart([])
      setSearchQuery('')
      setPaymentAmount('')
      setCustomerName('')
      setSelectedCustomerId(null)
      setTicketNumber((n) => n + 1)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      toast.success('Venta registrada')
      if (autoPrintEnabled) {
        setTimeout(() => handlePrint(), 400)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar la venta')
    },
  })

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Factura-${completedSale?.id || 'POS'}`,
    onAfterPrint: () => {
      setShowReceipt(false)
      setCompletedSale(null)
      searchInputRef.current?.focus()
    },
  })

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return products
      .filter((p) => p.isActive && p.stock > 0)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query),
      )
      .slice(0, 8)
  }, [products, searchQuery])

  const filteredCustomers = useMemo(() => {
    const query = customerName.trim().toLowerCase()
    if (!query) return []
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(query) ||
          c.document?.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query),
      )
      .slice(0, 6)
  }, [customers, customerName])

  const playBeep = () => {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE',
      )
      audio.volume = 0.2
      audio.play().catch(() => {})
    } catch {
      // ignore
    }
  }

  const addToCartWithPresentation = (
    product: Product,
    presentation: PresentationOption,
    quantity: number = 1,
  ) => {
    const baseQuantityNeeded = quantity * presentation.factor

    if (baseQuantityNeeded > product.stock) {
      toast.error('Stock insuficiente para esa presentación')
      return
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.productId === product.id && item.unitFactor === presentation.factor,
      )
      if (existing) {
        const newQuantity = existing.quantity + quantity
        const existingBaseTotal = newQuantity * presentation.factor
        if (existingBaseTotal > product.stock) {
          toast.error('Stock insuficiente')
          return current
        }
        return current.map((item) =>
          item === existing ? { ...item, quantity: newQuantity } : item,
        )
      }
      return [
        ...current,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          price: presentation.price,
          quantity,
          stock: product.stock,
          unitFactor: presentation.factor,
          unitLabel: presentation.label,
          productUnitId: presentation.productUnitId,
        },
      ]
    })

    setSearchQuery('')
    searchInputRef.current?.focus()
    playBeep()
  }

  const addProductToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      toast.error('Sin stock disponible')
      return
    }

    const presentations = getPresentations(product)

    if (presentations.length > 1) {
      // El producto tiene más de una presentación (ej. Unidad + Caja x10): preguntar cuál vender
      setPresentationPicker(product)
      return
    }

    addToCartWithPresentation(product, presentations[0], quantity)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredProducts.length > 0) {
        addProductToCart(filteredProducts[0])
      } else if (searchQuery.trim()) {
        // Buscar coincidencia exacta por SKU/código de barras del producto o de una presentación
        const exactProduct = products.find(
          (p) => p.sku === searchQuery.trim() || p.barcode === searchQuery.trim(),
        )
        if (exactProduct) {
          addProductToCart(exactProduct)
          return
        }
        const productWithUnit = products.find((p) =>
          p.units.some((u) => u.barcode === searchQuery.trim()),
        )
        if (productWithUnit) {
          const unit = productWithUnit.units.find((u) => u.barcode === searchQuery.trim())!
          addToCartWithPresentation(productWithUnit, {
            label: unit.name,
            price: unit.price,
            factor: unit.factor,
            productUnitId: unit.id,
          })
          return
        }
        toast.error('Producto no encontrado')
      }
    }
  }

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProduct(index)
      return
    }
    const item = cart[index]
    if (item && newQuantity * item.unitFactor > item.stock) {
      toast.error('Stock insuficiente')
      return
    }
    setCart((current) =>
      current.map((cartItem, i) => (i === index ? { ...cartItem, quantity: newQuantity } : cartItem)),
    )
  }

  const removeProduct = (index: number) => {
    setCart((current) => current.filter((_, i) => i !== index))
  }

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('¿Limpiar toda la venta?')) {
      setCart([])
      setSearchQuery('')
      setPaymentAmount('')
      setCustomerName('')
      setSelectedCustomerId(null)
      searchInputRef.current?.focus()
      toast.success('Venta limpiada')
    }
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const tax = 0
  const discount = 0
  const total = subtotal + tax - discount

  const paidAmount = paymentAmount.trim() === '' ? total : parseFloat(paymentAmount) || 0
  const change = paidAmount - total

  const focusPayment = () => {
    if (cart.length === 0) {
      toast.error('Agrega productos para cobrar')
      return
    }
    paymentInputRef.current?.focus()
    paymentInputRef.current?.select()
  }

  const handleConfirmPayment = () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }
    if (paidAmount < total) {
      toast.error('Monto insuficiente')
      return
    }
    createSaleMutation.mutate({
      customerId: selectedCustomerId ?? undefined,
      customerName: !selectedCustomerId ? customerName.trim() || undefined : undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        unitFactor: item.unitFactor,
        unitLabel: item.unitLabel,
        productUnitId: item.productUnitId ?? undefined,
      })),
      tax,
      discount,
    })
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        focusPayment()
      }
      if (e.key === 'F8') {
        e.preventDefault()
        clearCart()
      }
      if (e.key === 'Escape') {
        setShowReceipt(false)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cart, total])

  const reprintLast = () => {
    if (!lastSale) {
      toast.error('No hay ticket anterior')
      return
    }
    setCompletedSale(lastSale)
    setShowReceipt(true)
  }

  return (
    <>
      <div className="flex h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        {/* ===== Barra de herramientas (estilo Eleventa: una sola fila plana) ===== */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          <span className="mr-2 text-xs font-medium text-slate-400">Ticket #{ticketNumber}</span>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              🗑️ Limpiar <span className="text-xs text-slate-400">F8</span>
            </button>
            <button
              onClick={reprintLast}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              🖨️ Reimprimir
            </button>
          </div>
        </div>

        {/* ===== Buscador de producto ===== */}
        <div className="relative border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Código / Producto</span>
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanea o escribe el nombre / código…"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500/20"
                autoComplete="off"
              />
            </div>
            <span className="hidden shrink-0 text-xs text-slate-400 sm:block">Enter agrega el producto</span>
          </div>

          {searchQuery && filteredProducts.length > 0 && (
            <div className="absolute left-4 right-4 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProductToCart(product)}
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-2.5 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{product.sku}</p>
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{product.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span
                      className={`text-xs ${
                        product.stock <= product.minStock ? 'font-semibold text-red-500' : 'text-slate-400'
                      }`}
                    >
                      Stock {product.stock}
                    </span>
                    {product.units.length > 0 ? (
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        {product.units.length + 1} presentaciones
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{money(product.price)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery && filteredProducts.length === 0 && (
            <div className="absolute left-4 right-4 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-3 text-center text-sm text-slate-400 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              Sin resultados para “{searchQuery}”
            </div>
          )}
        </div>

        {/* ===== Ticket ===== */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <div className="text-5xl">🧾</div>
              <p className="text-base">Escanea o busca un producto para iniciar la venta</p>
              {isLoading && <p className="text-sm">Cargando catálogo…</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Código</th>
                  <th className="px-4 py-2 text-left font-medium">Descripción</th>
                  <th className="w-32 px-4 py-2 text-center font-medium">Cant.</th>
                  <th className="w-28 px-4 py-2 text-right font-medium">Precio</th>
                  <th className="w-32 px-4 py-2 text-right font-medium">Importe</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr
                    key={`${item.productId}-${item.unitFactor}`}
                    className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{item.sku}</td>
                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                      {item.name}
                      {item.unitLabel !== 'Unidad' && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                          {item.unitLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-12 rounded border border-slate-200 bg-white py-0.5 text-center text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          min={1}
                          max={Math.floor(item.stock / item.unitFactor)}
                        />
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          disabled={(item.quantity + 1) * item.unitFactor > item.stock}
                          className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{money(item.price)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white">
                      {money(item.quantity * item.price)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeProduct(index)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== Barra de cobro inferior ===== */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          {/* Cliente (autocompleta desde la base de clientes registrados) */}
          <div className="relative mb-3 flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-slate-400">👤 Cliente</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value)
                setSelectedCustomerId(null)
                setShowCustomerSuggestions(true)
              }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 100)}
              onKeyDown={(e) => e.key === 'Enter' && !showCustomerSuggestions && focusPayment()}
              placeholder="Busca un cliente registrado o escribe uno nuevo (opcional)"
              className="flex-1 border-b border-slate-200 bg-transparent pb-0.5 text-sm text-slate-700 placeholder-slate-300 focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500"
            />
            {selectedCustomerId && (
              <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                Registrado
              </span>
            )}
            {customerName && (
              <button
                type="button"
                onClick={() => {
                  setCustomerName('')
                  setSelectedCustomerId(null)
                }}
                className="text-slate-300 hover:text-slate-500"
                tabIndex={-1}
              >
                ✕
              </button>
            )}

            {showCustomerSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setCustomerName(customer.fullName)
                      setSelectedCustomerId(customer.id)
                      setShowCustomerSuggestions(false)
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{customer.fullName}</p>
                      <p className="text-xs text-slate-400">
                        {customer.code}
                        {customer.document ? ` · ${customer.document}` : ''}
                      </p>
                    </div>
                    {customer.phone && (
                      <span className="shrink-0 text-xs text-slate-400">{customer.phone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-400">Total</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{money(total)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Pagó con</label>
              <input
                ref={paymentInputRef}
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmPayment()}
                placeholder={total > 0 ? String(total) : '0'}
                className="w-full border-b-2 border-slate-200 bg-transparent text-2xl font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Cambio</p>
              <p className={`text-2xl font-semibold ${change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {money(change < 0 ? change : Math.max(change, 0))}
              </p>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={handleConfirmPayment}
                disabled={cart.length === 0 || createSaleMutation.isPending}
                className="flex h-full min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-40"
              >
                Cobrar <span className="text-sm font-normal opacity-80">F9</span>
              </button>
            </div>
          </div>

          <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={autoPrintEnabled}
              onChange={(e) => setAutoPrintEnabled(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            Imprimir automáticamente al cobrar
          </label>
        </div>
      </div>

      {/* ===== Modal de selección de presentación ===== */}
      {presentationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{presentationPicker.name}</h2>
            <p className="mt-1 text-sm text-slate-400">Elige la presentación a vender</p>

            <div className="mt-4 space-y-2">
              {getPresentations(presentationPicker).map((presentation) => (
                <button
                  key={presentation.label}
                  onClick={() => {
                    addToCartWithPresentation(presentationPicker, presentation)
                    setPresentationPicker(null)
                  }}
                  disabled={presentation.factor > presentationPicker.stock}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-blue-500/10"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{presentation.label}</p>
                    <p className="text-xs text-slate-400">
                      {presentation.factor > 1 ? `${presentation.factor} unidades` : '1 unidad'}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">{money(presentation.price)}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPresentationPicker(null)}
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ===== Modal de recibo ===== */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  ✓
                </span>
                Venta completada
              </h2>
              <button
                onClick={() => {
                  setShowReceipt(false)
                  setCompletedSale(null)
                  searchInputRef.current?.focus()
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 max-h-[55vh] overflow-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Receipt
                ref={receiptRef}
                saleId={completedSale.id}
                date={completedSale.created_at}
                customerName={
                  completedSale.customers?.full_name ||
                  lastCustomerNameRef.current ||
                  undefined
                }
                config={receiptConfig}
                items={completedSale.sale_items.map((item) => ({
                  name:
                    item.unit_label && item.unit_label !== 'Unidad'
                      ? `${item.products.name} (${item.unit_label})`
                      : item.products.name,
                  quantity: item.unit_quantity,
                  unitPrice: item.unit_price,
                  lineTotal: item.line_total,
                }))}
                subtotal={completedSale.subtotal}
                tax={completedSale.tax}
                discount={completedSale.discount}
                total={completedSale.total}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => {
                  setShowReceipt(false)
                  setCompletedSale(null)
                  searchInputRef.current?.focus()
                }}
                className="rounded-lg px-4 py-2.5 font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
