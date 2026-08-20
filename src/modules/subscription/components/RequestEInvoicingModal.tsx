import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useUiStore } from '../../../store/ui-store'

type Props = {
  open: boolean
  onClose: () => void
}

/** Contacto al que llega la solicitud. Configurable por entorno. */
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'soporte@capsula.app'
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP || ''

/**
 * Solicitud de facturación electrónica. No hay backend de suscripciones todavía,
 * así que la solicitud se envía por correo (o WhatsApp) con los datos ya
 * armados: es un canal real y no un botón que no hace nada.
 */
export function RequestEInvoicingModal({ open, onClose }: Props) {
  const user = useUiStore((state) => state.user)
  const [nit, setNit] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setNit('')
    setPhone('')
    setNote('')
  }, [open])

  if (!open) return null

  const buildMessage = () =>
    [
      'Hola, quiero solicitar la facturación electrónica para mi establecimiento.',
      '',
      `Establecimiento: ${user?.storeName ?? '(sin nombre)'}`,
      `Solicitante: ${user?.fullName ?? ''} (${user?.email ?? ''})`,
      `NIT: ${nit || 'pendiente'}`,
      `Teléfono de contacto: ${phone || 'pendiente'}`,
      note ? `Notas: ${note}` : '',
    ]
      .filter(Boolean)
      .join('\n')

  const handleEmail = () => {
    const subject = `Solicitud de facturación electrónica · ${user?.storeName ?? 'Cápsula'}`
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage())}`
    toast.success('Abrimos tu correo con la solicitud lista para enviar')
    onClose()
  }

  const handleWhatsApp = () => {
    const digits = SUPPORT_WHATSAPP.replace(/\D/g, '')
    if (!digits) {
      toast.error('No hay un número de WhatsApp configurado. Usa el envío por correo.')
      return
    }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Solicitar facturación electrónica
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Se habilita como servicio aparte del plan Gratis
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {user?.storeName ?? 'Tu establecimiento'}
            </p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              {user?.fullName} · {user?.email}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              NIT o documento del negocio
            </span>
            <input
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="Ej: 900123456-7"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Teléfono de contacto
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 300 123 4567"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Notas (opcional)
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="¿Ya tienes resolución de numeración DIAN? ¿Usas otro proveedor hoy?"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Para habilitarla necesitaremos el RUT y la resolución de numeración de la DIAN. Te
            contactamos para completar el trámite y confirmar el costo del servicio.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          {SUPPORT_WHATSAPP && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Enviar por WhatsApp
            </button>
          )}
          <button
            type="button"
            onClick={handleEmail}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  )
}
