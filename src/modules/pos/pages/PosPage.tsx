import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useReactToPrint } from 'react-to-print'
import { Receipt } from '../../../components/Receipt'
import { BarcodeScanner } from '../../../components/BarcodeScanner'
import { listProducts, type Product } from '../../../services/api/products'
import {
  createSale,
  listSales,
  type Sale,
  type PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '../../../services/api/sales'
import { listCustomers } from '../../../services/api/customers'
import { getCurrentCashRegister, listCashRegisterHistory } from '../../../services/api/cash-registers'
import { useReceiptConfig } from '../../../hooks/useReceiptConfig'
import { useUiStore } from '../../../store/ui-store'

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

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

type ProductSalesSummary = {
  productName: string
  unitLabel: string
  quantity: number
  total: number
}

export function PosPage() {
  const user = useUiStore((state) => state.user)
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

  const cashRegisterQuery = useQuery({
    queryKey: ['cash-register-current'],
    queryFn: getCurrentCashRegister,
    refetchInterval: 30000,
  })
  const isRegisterOpen = Boolean(cashRegisterQuery.data)

  const [showDailySales, setShowDailySales] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const dailySalesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => listSales(),
    enabled: showDailySales,
  })
  const registerHistoryQuery = useQuery({
    queryKey: ['cash-register-history'],
    queryFn: listCashRegisterHistory,
    enabled: showDailySales,
  })

  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [paymentMethod2, setPaymentMethod2] = useState<PaymentMethod>('TRANSFER')
  const [splitAmount1, setSplitAmount1] = useState('')
  const [splitAmount2, setSplitAmount2] = useState('')
  const [cashReceived, setCashReceived] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true)
  const [ticketNumber, setTicketNumber] = useState(1)
  const [presentationPicker, setPresentationPicker] = useState<Product | null>(null)
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const [dailySalesTab, setDailySalesTab] = useState<'PAYMENTS' | 'PRODUCTS'>('PAYMENTS')
  const [dailySalesPaymentFilter, setDailySalesPaymentFilter] = useState<string>('ALL')

  const createSaleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      setCompletedSale(sale)
      setLastSale(sale)
      setShowReceipt(true)
      setCart([])
      setSearchQuery('')
      setPaymentAmount('')
      setPaymentMethod('CASH')
      setIsSplitPayment(false)
      setPaymentMethod2('TRANSFER')
      setSplitAmount1('')
      setSplitAmount2('')
      setCashReceived('')
      setCustomerName('')
      setSelectedCustomerId(null)
      setTicketNumber((n) => n + 1)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      // El estado de caja incluye totales "del turno" (ventas en efectivo/otras
      // hasta ahora) que deben refrescarse tras cada venta, o quedan en caché
      // con el valor de cuando se abrió la caja.
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] })
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
    // Se usa Web Audio API (oscilador) en vez de <audio>/new Audio(...) a propósito:
    // un elemento HTMLMediaElement registra una "sesión de medios" en el navegador,
    // lo que hace que Chrome/Edge muestre el popup de "Controles multimedia globales"
    // (◄ ❙❙ ►) flotando sobre la ventana mientras esa sesión siga activa, incluso al
    // navegar a otras páginas de la SPA. Un oscilador no crea esa sesión.
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.05
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.08)
      oscillator.onended = () => ctx.close()
    } catch {
      // ignore
    }
  }

  /**
   * Suma en UNIDADES BASE todo lo que ya está reservado en el carrito para un producto,
   * sin importar la presentación (Unidad, Caja x10, etc). Permite excluir una presentación
   * (por su factor) para calcular cuánto queda disponible para ESA línea en particular.
   */
  const getReservedBaseQuantity = (productId: string, excludeFactor?: number) =>
    cart.reduce((sum, item) => {
      if (item.productId !== productId) return sum
      if (excludeFactor !== undefined && item.unitFactor === excludeFactor) return sum
      return sum + item.quantity * item.unitFactor
    }, 0)

  const addToCartWithPresentation = (
    product: Product,
    presentation: PresentationOption,
    quantity: number = 1,
  ) => {
    const existing = cart.find(
      (item) => item.productId === product.id && item.unitFactor === presentation.factor,
    )
    const newQuantity = (existing?.quantity ?? 0) + quantity
    const reservedByOtherLines = getReservedBaseQuantity(product.id, presentation.factor)
    const totalReserved = reservedByOtherLines + newQuantity * presentation.factor

    if (totalReserved > product.stock) {
      toast.error('Stock insuficiente para esa presentación')
      return
    }

    setCart((current) => {
      const existingItem = current.find(
        (item) => item.productId === product.id && item.unitFactor === presentation.factor,
      )
      if (existingItem) {
        return current.map((item) =>
          item === existingItem ? { ...item, quantity: newQuantity } : item,
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
    if (item) {
      const reservedByOtherLines = getReservedBaseQuantity(item.productId, item.unitFactor)
      if (reservedByOtherLines + newQuantity * item.unitFactor > item.stock) {
        toast.error('Stock insuficiente')
        return
      }
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
      setPaymentMethod('CASH')
      setIsSplitPayment(false)
      setPaymentMethod2('TRANSFER')
      setSplitAmount1('')
      setSplitAmount2('')
      setCashReceived('')
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

  // Cálculos de pago único vs pago mixto
  const singlePaidAmount = paymentAmount.trim() === '' ? total : parseFloat(paymentAmount) || 0

  const parsedSplit1 = parseFloat(splitAmount1) || 0
  const parsedSplit2 = parseFloat(splitAmount2) || 0
  const splitTotal = parsedSplit1 + parsedSplit2

  // Calcular porción de efectivo si aplica en pago mixto
  const hasCashInSplit = isSplitPayment && (paymentMethod === 'CASH' || paymentMethod2 === 'CASH')
  const cashAmountInSplit = isSplitPayment
    ? (paymentMethod === 'CASH' ? parsedSplit1 : 0) + (paymentMethod2 === 'CASH' ? parsedSplit2 : 0)
    : 0

  const cashReceivedAmount = cashReceived.trim() === '' ? cashAmountInSplit : parseFloat(cashReceived) || 0

  const change = isSplitPayment
    ? (hasCashInSplit ? cashReceivedAmount - cashAmountInSplit : 0)
    : (paymentMethod === 'CASH' ? singlePaidAmount - total : 0)

  const focusPayment = () => {
    if (!isRegisterOpen) {
      toast.error('Debes abrir la caja antes de cobrar')
      return
    }
    if (cart.length === 0) {
      toast.error('Agrega productos para cobrar')
      return
    }
    paymentInputRef.current?.focus()
    paymentInputRef.current?.select()
  }

  const customerNameRef = useRef<HTMLInputElement>(null)

  const handleConfirmPayment = () => {
    if (user?.isTrialExpired) {
      toast.error('🔴 El período de prueba ha finalizado. La aplicación está en modo solo lectura. Comunícate con soporte para habilitar el servicio completo.')
      return
    }
    if (!isRegisterOpen) {
      toast.error('Debes abrir la caja antes de cobrar')
      return
    }
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    // Ventas PENDIENTES requieren el nombre del deudor
    if (paymentMethod === 'PENDING' && !selectedCustomerId && !customerName.trim()) {
      toast.error('⏳ Debes ingresar el nombre de la persona que debe esta factura (Fiado)')
      customerNameRef.current?.focus()
      return
    }

    const currentCustName = customerName.trim()
    lastCustomerNameRef.current = currentCustName

    if (isSplitPayment) {
      if (parsedSplit1 <= 0 || parsedSplit2 <= 0) {
        toast.error('Ingresa ambos montos para el pago mixto')
        return
      }
      if (Math.round(splitTotal) !== Math.round(total)) {
        toast.error(`La suma de los dos pagos (${money(splitTotal)}) debe ser igual al total (${money(total)})`)
        return
      }
      if (paymentMethod === paymentMethod2) {
        toast.error('Selecciona dos medios de pago diferentes')
        return
      }
      if (hasCashInSplit && cashReceivedAmount < cashAmountInSplit) {
        toast.error('El efectivo recibido es menor a la porción requerida en efectivo')
        return
      }

      createSaleMutation.mutate({
        customerId: selectedCustomerId ?? undefined,
        customerName: !selectedCustomerId ? customerName.trim() || undefined : undefined,
        paymentMethod,
        paymentMethod2,
        amountPaid1: parsedSplit1,
        amountPaid2: parsedSplit2,
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
      return
    }

    if (paymentMethod === 'CASH' && singlePaidAmount < total) {
      toast.error('Monto insuficiente')
      return
    }

    createSaleMutation.mutate({
      customerId: selectedCustomerId ?? undefined,
      customerName: !selectedCustomerId ? customerName.trim() || undefined : undefined,
      paymentMethod,
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
        setShowMobileMenu(false)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cart, total])

  // Cerrar menú móvil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false)
      }
    }
    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileMenu])

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
            {/* Botones normales: visibles solo en pantallas medianas+ */}
            <button
              onClick={() => setShowDailySales(true)}
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
            >
              📅 Ventas del día
            </button>
            <button
              onClick={clearCart}
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
            >
              🗑️ Limpiar <span className="text-xs text-slate-400">F8</span>
            </button>
            <button
              onClick={reprintLast}
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
            >
              🖨️ Reimprimir
            </button>

            {/* Menú 3 puntos: visible solo en móvil */}
            <div ref={mobileMenuRef} className="relative sm:hidden">
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Más opciones"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    onClick={() => { setShowDailySales(true); setShowMobileMenu(false) }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    📅 Ventas del día
                  </button>
                  <button
                    onClick={() => { clearCart(); setShowMobileMenu(false) }}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    🗑️ Limpiar venta
                  </button>
                  <button
                    onClick={() => { reprintLast(); setShowMobileMenu(false) }}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    🖨️ Reimprimir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!cashRegisterQuery.isLoading && !isRegisterOpen && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <span>⚠️ La caja está cerrada. Debes abrirla antes de poder cobrar.</span>
            <Link
              to="/caja"
              className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              Abrir caja
            </Link>
          </div>
        )}

        {/* ===== Buscador de producto ===== */}
        <div className="relative border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-slate-500 dark:text-slate-400 sm:block">Código / Producto</span>
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar o escanear producto…"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-500/20"
                autoComplete="off"
              />
            </div>
            {/* Botón cámara */}
            <button
              onClick={() => setShowScanner(true)}
              title="Escanear con cámara"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </button>
            <span className="hidden shrink-0 text-xs text-slate-400 sm:block">Enter agrega</span>
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
                          max={Math.floor(
                            (item.stock - getReservedBaseQuantity(item.productId, item.unitFactor)) /
                              item.unitFactor,
                          )}
                        />
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          disabled={
                            getReservedBaseQuantity(item.productId, item.unitFactor) +
                              (item.quantity + 1) * item.unitFactor >
                            item.stock
                          }
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
            <span className={`shrink-0 text-xs font-medium ${paymentMethod === 'PENDING' ? 'text-amber-500 font-semibold' : 'text-slate-400'}`}>
              {paymentMethod === 'PENDING' ? '⏳ Deudor *' : '👤 Cliente'}
            </span>
            <input
              ref={customerNameRef}
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
              placeholder={paymentMethod === 'PENDING' ? 'Nombre del cliente que debe esta factura (obligatorio)' : 'Busca un cliente registrado o escribe uno nuevo (opcional)'}
              className={`flex-1 border-b pb-0.5 text-sm bg-transparent focus:outline-none dark:text-slate-200 ${
                paymentMethod === 'PENDING'
                  ? 'border-amber-400 text-amber-700 placeholder-amber-300 focus:border-amber-500 dark:border-amber-600 dark:text-amber-300 dark:placeholder-amber-600'
                  : 'border-slate-200 text-slate-700 placeholder-slate-300 focus:border-blue-400 dark:border-slate-700 dark:placeholder-slate-500'
              }`}
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

          {/* Header de Método de Pago y Selector de Pago Mixto */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-slate-400">
                {isSplitPayment ? 'Pago mixto (2 medios)' : 'Método de pago'}
              </span>
              {!isSplitPayment && (
                <>
                  {/* Botones: visibles en pantallas medianas+ */}
                  <div className="hidden gap-1.5 sm:flex">
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          paymentMethod === method
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {PAYMENT_METHOD_LABELS[method]}
                      </button>
                    ))}
                  </div>
                  {/* Selector desplegable: visible solo en móvil */}
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:hidden"
                  >
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !isSplitPayment
                setIsSplitPayment(next)
                if (next) {
                  setPaymentMethod('TRANSFER')
                  setPaymentMethod2('CASH')
                  setSplitAmount1('')
                  setSplitAmount2('')
                  setCashReceived('')
                } else {
                  setPaymentMethod('CASH')
                }
              }}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition border ${
                isSplitPayment
                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isSplitPayment ? '↺ Pago único' : '💳 2 medios de pago'}
            </button>
          </div>

          {isSplitPayment ? (
            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Medio 1 */}
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Medio 1</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-400">$</span>
                    <input
                      type="number"
                      value={splitAmount1}
                      onChange={(e) => {
                        const val = e.target.value
                        setSplitAmount1(val)
                        const n = parseFloat(val) || 0
                        if (n <= total && total > 0) {
                          setSplitAmount2(String(Math.max(0, total - n)))
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmPayment()}
                      placeholder="Monto 1"
                      className="w-full bg-transparent text-lg font-semibold text-slate-900 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                {/* Medio 2 */}
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Medio 2</span>
                    <select
                      value={paymentMethod2}
                      onChange={(e) => setPaymentMethod2(e.target.value as PaymentMethod)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-400">$</span>
                    <input
                      type="number"
                      value={splitAmount2}
                      onChange={(e) => setSplitAmount2(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmPayment()}
                      placeholder="Monto 2"
                      className="w-full bg-transparent text-lg font-semibold text-slate-900 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Fila inferior: Efectivo recibido (si aplica), Total y botón Cobrar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end pt-1">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total venta</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{money(total)}</p>
                </div>

                {hasCashInSplit ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Efectivo recibido
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmPayment()}
                        placeholder={String(cashAmountInSplit)}
                        className="w-full border-b border-slate-300 bg-transparent text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cambio (efectivo)</p>
                      <p className={`text-lg font-semibold ${change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {money(change < 0 ? change : Math.max(change, 0))}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Suma de pagos</p>
                    <p className={`text-lg font-semibold ${Math.round(splitTotal) === Math.round(total) && splitTotal > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {money(splitTotal)} {Math.round(splitTotal) !== Math.round(total) && `(Faltan ${money(total - splitTotal)})`}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    onClick={handleConfirmPayment}
                    disabled={!isRegisterOpen || cart.length === 0 || createSaleMutation.isPending || user?.isTrialExpired}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cobrar <span className="text-xs font-normal opacity-80">F9</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
                  disabled={!isRegisterOpen || cart.length === 0 || createSaleMutation.isPending || user?.isTrialExpired}
                  className="flex h-full min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-40"
                >
                  Cobrar <span className="text-sm font-normal opacity-80">F9</span>
                </button>
              </div>
            </div>
          )}

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

      {/* ===== Modal de ventas del día ===== */}
      {showDailySales && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="flex h-[92vh] sm:h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="mb-3 sm:mb-4 flex shrink-0 items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Ventas del día</h2>
              <button
                onClick={() => setShowDailySales(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {dailySalesQuery.isLoading || registerHistoryQuery.isLoading ? (
              <div className="flex-1 py-10 text-center text-sm text-slate-400">Cargando ventas…</div>
            ) : (
              (() => {
                const currentRegister = cashRegisterQuery.data
                // Último turno cerrado hoy (si existe), para usar como respaldo cuando la caja está cerrada.
                const lastClosedToday = (registerHistoryQuery.data ?? [])
                  .filter((r) => r.status === 'CLOSED' && r.closedAt && isSameDay(r.closedAt))
                  .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime())[0]

                // Alcance del resumen: SIEMPRE un turno específico, nunca el día completo mezclado.
                // 1) Si hay caja abierta: ventas desde que se abrió ese turno.
                // 2) Si no hay caja abierta: ventas del último turno cerrado hoy (desde su apertura hasta su cierre).
                // 3) Si no hay ningún turno hoy: no hay ventas que mostrar.
                const scopeStart = currentRegister?.openedAt ?? lastClosedToday?.openedAt ?? null
                const scopeEnd = currentRegister ? null : lastClosedToday?.closedAt ?? null

                const scopedSales = scopeStart
                  ? (dailySalesQuery.data ?? []).filter((sale) => {
                      const createdAt = new Date(sale.created_at).getTime()
                      if (createdAt < new Date(scopeStart).getTime()) return false
                      if (scopeEnd && createdAt > new Date(scopeEnd).getTime()) return false
                      return true
                    })
                  : []

                const currentTotal = currentRegister?.salesTotalSoFar
                const totalToday = currentTotal !== undefined ? currentTotal : scopedSales.reduce((sum, sale) => sum + sale.total, 0)
                const itemsToday = scopedSales.reduce(
                  (sum, sale) => sum + sale.sale_items.reduce((iSum, item) => iSum + item.unit_quantity, 0),
                  0,
                )

                // Desglose por método de pago (sincronizado con la caja del turno si está disponible)
                const byMethod: Record<string, number> = currentRegister?.salesByPaymentMethodSoFar
                  ? { ...currentRegister.salesByPaymentMethodSoFar }
                  : { CASH: 0, CARD: 0, TRANSFER: 0, PENDING: 0, OTHER: 0 }

                if (!currentRegister?.salesByPaymentMethodSoFar) {
                  for (const sale of scopedSales) {
                    if (sale.payment_method_2) {
                      const pm1 = sale.payment_method || 'CASH'
                      const pm2 = sale.payment_method_2 || 'TRANSFER'
                      const amt1 = Number(sale.amount_paid_1 ?? 0)
                      const amt2 = Number(sale.amount_paid_2 ?? 0)
                      byMethod[pm1] = (byMethod[pm1] || 0) + amt1
                      byMethod[pm2] = (byMethod[pm2] || 0) + amt2
                    } else {
                      const pm = sale.payment_method || 'CASH'
                      byMethod[pm] = (byMethod[pm] || 0) + sale.total
                    }
                  }
                }

                // Agrupar por producto + presentación vendida
                const productSummaryMap = new Map<string, ProductSalesSummary>()
                for (const sale of scopedSales) {
                  for (const item of sale.sale_items) {
                    const key = `${item.product_id}-${item.unit_label}`
                    const existing = productSummaryMap.get(key)
                    if (existing) {
                      existing.quantity += item.unit_quantity
                      existing.total += item.line_total
                    } else {
                      productSummaryMap.set(key, {
                        productName: item.products.name,
                        unitLabel: item.unit_label,
                        quantity: item.unit_quantity,
                        total: item.line_total,
                      })
                    }
                  }
                }
                const productSummary = Array.from(productSummaryMap.values()).sort(
                  (a, b) => b.total - a.total,
                )

                return (
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <p className="text-xs text-slate-400">
                        {currentRegister
                          ? `Turno actual desde las ${formatTime(currentRegister.openedAt)}`
                          : lastClosedToday
                            ? `Último turno (${formatTime(lastClosedToday.openedAt)} – ${formatTime(lastClosedToday.closedAt!)})`
                            : 'Sin turno hoy'}
                      </p>

                      {/* 2 Botones para alternar vistas */}
                      <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setDailySalesTab('PAYMENTS')}
                          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            dailySalesTab === 'PAYMENTS'
                              ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          💳 Ingresos por método
                        </button>
                        <button
                          type="button"
                          onClick={() => setDailySalesTab('PRODUCTS')}
                          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            dailySalesTab === 'PRODUCTS'
                              ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          📦 Productos y facturas
                        </button>
                      </div>
                    </div>

                    {/* Resumen principal */}
                    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3 text-center dark:border-slate-800 dark:bg-slate-800/60">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Ventas</p>
                        <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">{scopedSales.length}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3 text-center dark:border-slate-800 dark:bg-slate-800/60">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Unidades</p>
                        <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">{itemsToday}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3 text-center dark:border-slate-800 dark:bg-slate-800/60">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Total neto</p>
                        <p className="mt-0.5 text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{money(totalToday)}</p>
                      </div>
                    </div>

                    {dailySalesTab === 'PAYMENTS' ? (
                      /* VISTA 1: INGRESOS POR CADA MÉTODO DE PAGO */
                      <div className="space-y-4">
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Ingresos por cada método de pago
                          </h3>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {([
                              ['CASH', '💵', 'Efectivo', 'emerald'],
                              ['TRANSFER', '🏦', 'Transferencia', 'purple'],
                              ['CARD', '💳', 'Tarjeta', 'blue'],
                              ['PENDING', '⏳', 'Pendiente (Fiado)', 'amber'],
                              ['OTHER', '🔄', 'Otro', 'slate'],
                            ] as const).map(([key, icon, label]) => {
                              const val = byMethod[key] || 0
                              const isSelected = dailySalesPaymentFilter === key
                              return (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={() => setDailySalesPaymentFilter((prev) => (prev === key ? 'ALL' : key))}
                                  className={`rounded-xl border p-3 text-left transition ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/30 dark:border-blue-500 dark:bg-blue-950/40'
                                      : key === 'PENDING' && val > 0
                                      ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-900/10'
                                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{icon} {label}</span>
                                    {totalToday > 0 && val > 0 && (
                                      <span className="text-[10px] font-medium text-slate-400">
                                        {Math.round((val / totalToday) * 100)}%
                                      </span>
                                    )}
                                  </div>
                                  <p className={`mt-1 text-base font-bold ${
                                    key === 'PENDING' && val > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                                  }`}>{money(val)}</p>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Lista de facturas filtradas por método */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {dailySalesPaymentFilter === 'ALL'
                                ? 'Facturas del turno'
                                : `Facturas pagadas con ${PAYMENT_METHOD_LABELS[dailySalesPaymentFilter as PaymentMethod] || dailySalesPaymentFilter}`}
                            </h3>
                            {dailySalesPaymentFilter !== 'ALL' && (
                              <button
                                onClick={() => setDailySalesPaymentFilter('ALL')}
                                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                Ver todos los métodos
                              </button>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                            {(() => {
                              const filtered = scopedSales.filter((sale) => {
                                if (dailySalesPaymentFilter === 'ALL') return true
                                return sale.payment_method === dailySalesPaymentFilter || sale.payment_method_2 === dailySalesPaymentFilter
                              })

                              if (filtered.length === 0) {
                                return (
                                  <div className="py-6 text-center text-xs text-slate-400">
                                    No hay ventas con este método de pago.
                                  </div>
                                )
                              }

                              return (
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 bg-slate-50 uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium">Factura</th>
                                      <th className="px-3 py-2 text-left font-medium">Hora</th>
                                      <th className="px-3 py-2 text-left font-medium">Cliente / Deudor</th>
                                      <th className="px-3 py-2 text-left font-medium">Método</th>
                                      <th className="px-3 py-2 text-right font-medium">Total</th>
                                      <th className="px-3 py-2 text-center" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filtered
                                      .slice()
                                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                      .map((sale) => (
                                        <tr key={sale.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                                          <td className="px-3 py-2 font-mono font-medium text-slate-700 dark:text-slate-300">
                                            #{sale.id.substring(0, 8).toUpperCase()}
                                          </td>
                                          <td className="px-3 py-2 text-slate-400">{formatTime(sale.created_at)}</td>
                                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                            {sale.customers?.full_name || sale.notes?.replace('Cliente: ', '') || 'Venta de mostrador'}
                                          </td>
                                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                            {sale.payment_method_2 ? (
                                              <span className="font-medium">
                                                {PAYMENT_METHOD_LABELS[sale.payment_method]} + {PAYMENT_METHOD_LABELS[sale.payment_method_2]}
                                              </span>
                                            ) : sale.payment_method === 'PENDING' ? (
                                              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                FIADO
                                              </span>
                                            ) : (
                                              PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                                            {money(sale.total)}
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            <button
                                              onClick={() => setViewingSale(sale)}
                                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                            >
                                              Ver
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* VISTA 2: PRODUCTOS VENDIDOS Y FACTURAS */
                      <div className="space-y-4">
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Productos vendidos
                          </h3>
                          <div className="max-h-48 overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                            {productSummary.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                Aún no se ha vendido ningún producto.
                              </div>
                            ) : (
                              <table className="w-full min-w-[320px] text-xs">
                                <thead className="sticky top-0 bg-slate-50 uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium">Producto</th>
                                    <th className="px-3 py-2 text-center font-medium">Cant.</th>
                                    <th className="px-3 py-2 text-right font-medium">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productSummary.map((item) => (
                                    <tr
                                      key={`${item.productName}-${item.unitLabel}`}
                                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                    >
                                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                        {item.productName}
                                        {item.unitLabel !== 'Unidad' && (
                                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                                            {item.unitLabel}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                                        {item.quantity}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                                        {money(item.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Tickets / Facturas emitidas
                          </h3>
                          <div className="max-h-48 overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                            {scopedSales.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                Aún no hay ventas registradas.
                              </div>
                            ) : (
                              <table className="w-full min-w-[400px] text-xs">
                                <thead className="sticky top-0 bg-slate-50 uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium">Factura</th>
                                    <th className="px-3 py-2 text-left font-medium">Hora</th>
                                    <th className="px-3 py-2 text-left font-medium">Cliente</th>
                                    <th className="px-3 py-2 text-center font-medium">Ítems</th>
                                    <th className="px-3 py-2 text-right font-medium">Total</th>
                                    <th className="px-3 py-2 text-center font-medium" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {scopedSales
                                    .slice()
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((sale) => (
                                      <tr
                                        key={sale.id}
                                        className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                                          sale.payment_method === 'PENDING' ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                                        }`}
                                      >
                                        <td className="px-3 py-2 font-mono font-medium text-slate-500 dark:text-slate-400">
                                          #{sale.id.substring(0, 8).toUpperCase()}
                                          {sale.payment_method === 'PENDING' && (
                                            <span className="ml-1 inline-block rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-800/40 dark:text-amber-400">FIADO</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                          {formatTime(sale.created_at)}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                          {sale.customers?.full_name || sale.notes?.replace('Cliente: ', '') || 'Venta de mostrador'}
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                                          {sale.sale_items.reduce((sum, item) => sum + item.unit_quantity, 0)}
                                        </td>
                                        <td className={`px-3 py-2 text-right font-semibold ${
                                          sale.payment_method === 'PENDING' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                                        }`}>
                                          {money(sale.total)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={() => setViewingSale(sale)}
                                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                                          >
                                            Ver
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}

      {/* ===== Modal de detalle de una venta (factura + productos vendidos) ===== */}
      {viewingSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] sm:max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="mb-1 flex shrink-0 items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                Factura #{viewingSale.id.substring(0, 8).toUpperCase()}
              </h2>
              <button
                onClick={() => setViewingSale(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              {new Date(viewingSale.created_at).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {' · '}
              {viewingSale.customers?.full_name || 'Venta de mostrador'}
            </p>

            <div className="flex-1 overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[320px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Producto</th>
                    <th className="px-3 py-2 text-center font-medium">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 text-right font-medium">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingSale.sale_items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {item.products.name}
                        {item.unit_label !== 'Unidad' && (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            {item.unit_label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                        {item.unit_quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                        {money(item.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                        {money(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{money(viewingSale.subtotal)}</span>
              </div>
              {viewingSale.discount > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Descuento</span>
                  <span>-{money(viewingSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-white">
                <span>Total</span>
                <span>{money(viewingSale.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Medio de pago</span>
                <span>
                  {viewingSale.payment_method_2 ? (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {PAYMENT_METHOD_LABELS[viewingSale.payment_method]} ({money(viewingSale.amount_paid_1 || 0)}) +{' '}
                      {PAYMENT_METHOD_LABELS[viewingSale.payment_method_2]} ({money(viewingSale.amount_paid_2 || 0)})
                    </span>
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {PAYMENT_METHOD_LABELS[viewingSale.payment_method] || viewingSale.payment_method}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewingSale(null)}
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 text-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ===== Modal de selección de presentación ===== */}
      {presentationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{presentationPicker.name}</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">Elige la presentación a vender</p>

            <div className="mt-4 space-y-2">
              {getPresentations(presentationPicker).map((presentation) => (
                <button
                  key={presentation.label}
                  onClick={() => {
                    addToCartWithPresentation(presentationPicker, presentation)
                    setPresentationPicker(null)
                  }}
                  disabled={
                    getReservedBaseQuantity(presentationPicker.id) + presentation.factor >
                    presentationPicker.stock
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 sm:px-4 sm:py-3 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-blue-500/10"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{presentation.label}</p>
                    <p className="text-xs text-slate-400">
                      {presentation.factor > 1 ? `${presentation.factor} unidades` : '1 unidad'}
                    </p>
                  </div>
                  <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{money(presentation.price)}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPresentationPicker(null)}
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ===== Modal de recibo ===== */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="mb-3 sm:mb-4 flex shrink-0 items-center justify-between">
              <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-sm">
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

            <div className="mb-4 flex-1 overflow-auto rounded-xl bg-slate-50 p-2.5 sm:p-3 dark:bg-slate-800">
              <Receipt
                ref={receiptRef}
                saleId={completedSale.id}
                date={completedSale.created_at}
                customerName={
                  completedSale.customers?.full_name ||
                  (completedSale.notes ? completedSale.notes.replace('Cliente: ', '') : undefined) ||
                  lastCustomerNameRef.current ||
                  undefined
                }
                config={receiptConfig}
                paymentMethod={completedSale.payment_method}
                paymentMethod2={completedSale.payment_method_2}
                amountPaid1={completedSale.amount_paid_1}
                amountPaid2={completedSale.amount_paid_2}
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

            <div className="flex shrink-0 flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowReceipt(false)
                  setCompletedSale(null)
                  searchInputRef.current?.focus()
                }}
                className="w-full sm:flex-1 rounded-lg px-4 py-2.5 font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-center text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrint}
                className="w-full sm:flex-1 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-center text-sm"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de escáner de cámara ===== */}
      {showScanner && (
        <BarcodeScanner
          onDetected={(code) => {
            setShowScanner(false)
            // Buscar coincidencia exacta por SKU o código de barras del producto
            const exactProduct = products.find(
              (p) => p.sku === code.trim() || p.barcode === code.trim(),
            )
            if (exactProduct) {
              addProductToCart(exactProduct)
              return
            }
            // Buscar en presentaciones por unidad
            const productWithUnit = products.find((p) =>
              p.units.some((u) => u.barcode === code.trim()),
            )
            if (productWithUnit) {
              const unit = productWithUnit.units.find((u) => u.barcode === code.trim())!
              addToCartWithPresentation(productWithUnit, {
                label: unit.name,
                price: unit.price,
                factor: unit.factor,
                productUnitId: unit.id,
              })
              return
            }
            // Si no se encontró, dejar el código en el buscador para búsqueda manual
            setSearchQuery(code.trim())
            toast('Producto no encontrado. Puedes buscar manualmente.', { icon: '🔍' })
            setTimeout(() => searchInputRef.current?.focus(), 100)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}
