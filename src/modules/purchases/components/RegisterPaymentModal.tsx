import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { registerSupplierPayment, type Purchase } from '../../../services/api/purchases'
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../../services/api/sales'

type Props = {
  open: boolean
  purchase: Purchase | null
  onClose: () => void
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function RegisterPaymentModal({ open, purchase, onClose }: Props) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [note, setNote] = useState('')

  const balance = purchase ? purchase.total - purchase.amount_paid : 0

  useEffect(() => {
    if (open && purchase) {
      setAmount(String(balance))
      setPaymentMethod('CASH')
      setNote('')
    }
  }, [open, purchase, balance])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!purchase) return
      const parsedAmount = Number(amount)
      if (!parsedAmount || parsedAmount <= 0) {
        throw new Error('Ingresa un monto válido')
      }
      if (parsedAmount > balance) {
        throw new Error(`El pago no puede superar el saldo pendiente (${money(balance)})`)
      }
      return registerSupplierPayment(purchase.id, {
        amount: parsedAmount,
        paymentMethod,
        note: note.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-by-supplier'] })
      toast.success('Pago registrado correctamente')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.message || 'Error al registrar el pago')
    },
  })

  if (!open || !purchase) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Registrar pago a proveedor</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/60">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Proveedor</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {purchase.suppliers?.business_name || 'Desconocido'}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500 dark:text-slate-400">Total compra</span>
            <span className="font-medium text-slate-900 dark:text-white">{money(purchase.total)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500 dark:text-slate-400">Ya pagado</span>
            <span className="font-medium text-slate-900 dark:text-white">{money(purchase.amount_paid)}</span>
          </div>
          <div className="flex justify-between mt-1 border-t border-slate-200 pt-1 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Saldo pendiente</span>
            <span className="font-semibold text-red-600 dark:text-red-400">{money(balance)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Monto a pagar
            </span>
            <input
              type="number"
              min="0"
              max={balance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Método de pago
            </span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Nota (opcional)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Pago parcial, referencia de transferencia…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}
