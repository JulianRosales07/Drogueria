import { useState } from 'react'
import { useUiStore } from '../../../store/ui-store'
import { useStoreContext } from '../../../hooks/useStoreContext'
import { RequestEInvoicingModal } from '../components/RequestEInvoicingModal'
import { openSupportWhatsApp } from '../../../shared/utils/supportContact'

type Plan = {
  id: string
  name: string
  tagline: string
  price: string
  period: string
  features: string[]
  current?: boolean
  comingSoon?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'gratis',
    name: 'Básico / Prueba',
    tagline: 'Todo lo necesario para operar el día a día del negocio.',
    price: '$0',
    period: 'período de prueba',
    current: true,
    features: [
      'Punto de venta y facturación',
      'Inventario con presentaciones y códigos de barras',
      'Compras, proveedores y clientes',
      'Apertura y cierre de caja con arqueo',
      'Usuarios con permisos por página',
      'Reportes de ventas del período',
      'Facturación electrónica disponible aparte',
    ],
  },
  {
    id: 'plus',
    name: 'Pro Permanente',
    tagline: 'Para negocios que buscan operar con total tranquilidad y soporte continuo.',
    price: '$120.000',
    period: 'mensual',
    comingSoon: true,
    features: [
      'Todo lo del plan Básico',
      'Sin límite de días de prueba',
      'Facturación electrónica incluida',
      'Rentabilidad y costo de lo vendido (COGS)',
      'Utilidad por venta, producto y turno',
      'Exportación de reportes a Excel',
      'Respaldo diario de la información',
      'Soporte prioritario por WhatsApp',
    ],
  },
]

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: '¿Qué sucede cuando finaliza mi período de prueba?',
    answer:
      'Tu cuenta entra en modo consulta (solo lectura). Podrás ver todos tus datos, clientes e inventario, pero no podrás registrar nuevas ventas ni compras hasta que el Super Admin extienda o active tu suscripción.',
  },
  {
    question: '¿Cómo puedo renovar o extender mis días de prueba?',
    answer:
      'Comunícate directamente con soporte a través del botón de WhatsApp en esta pantalla o en la barra superior para activar tu acceso.',
  },
  {
    question: '¿Cómo funciona la facturación electrónica?',
    answer:
      'Está disponible bajo solicitud. Contáctanos con el botón de solicitud para iniciar el trámite con la DIAN.',
  },
]

export function SubscriptionPage() {
  const user = useUiStore((state) => state.user)
  const { storeTerm } = useStoreContext()
  const [requestOpen, setRequestOpen] = useState(false)

  const isTrial = user?.subscriptionStatus === 'TRIAL'
  const isExpired = user?.isTrialExpired || user?.subscriptionStatus === 'EXPIRED'
  const isActive = user?.subscriptionStatus === 'ACTIVE'

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : isExpired
                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
            }`}>
              {isActive ? '💎 Plan Permanente Activo' : isExpired ? '🔴 Período de Prueba Finalizado' : '⏳ Período de Prueba Activo'}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              Estado de Suscripción y Acceso
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isActive
                ? `Tu ${storeTerm.toLowerCase()} cuenta con acceso completo y permanente a todas las funciones operativas.`
                : isExpired
                ? `El período de prueba de tu ${storeTerm.toLowerCase()} ha finalizado. El sistema se encuentra en modo solo lectura.`
                : `Tu ${storeTerm.toLowerCase()} se encuentra en período de prueba gratuito (${user?.daysRemaining ?? 0} días restantes).`}
            </p>

            {(isTrial || isExpired) && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => openSupportWhatsApp(user?.storeName, user?.fullName, 'activar la suscripción')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
                >
                  <span>💬 Contactar a Soporte por WhatsApp</span>
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60 min-w-[220px]">
            <p className="text-xs text-slate-500 dark:text-slate-400">Estado actual</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {isActive ? 'Plan Permanente' : isExpired ? 'Prueba Vencida' : 'Prueba Gratuita'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isActive
                ? 'Sin fecha de vencimiento'
                : isExpired
                ? 'Modo solo lectura activado'
                : `${user?.daysRemaining ?? 0} días restantes` + (user?.trialEndsAt ? ` (hasta ${new Date(user.trialEndsAt).toLocaleDateString('es-CO')})` : '')}
            </p>
          </div>
        </div>
      </header>

      {/* Planes */}
      <section className="grid gap-5 lg:grid-cols-2">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-xl border p-6 ${
              plan.comingSoon
                ? 'border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-500/5'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</h2>
              {plan.current ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Plan actual
                </span>
              ) : (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  Próximamente
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{plan.tagline}</p>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {plan.price}
              </span>
              <span className="pb-1.5 text-xs text-slate-400">
                {plan.period === 'siempre' ? 'para siempre' : `/ ${plan.period}`}
              </span>
            </div>
            {plan.comingSoon && (
              <p className="mt-1 text-[11px] text-slate-400">
                Precio estimado en pesos colombianos. Puede ajustarse antes del lanzamiento.
              </p>
            )}

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px]">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      plan.comingSoon
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            {plan.current ? (
              <div className="mt-6 space-y-2.5">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/5 dark:text-emerald-400">
                  Estás usando este plan
                </div>
                <button
                  type="button"
                  onClick={() => setRequestOpen(true)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-500/10"
                >
                  Solicitar facturación electrónica
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="El plan Plus todavía no está disponible para contratar"
                className="mt-6 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
              >
                Disponible próximamente
              </button>
            )}
          </article>
        ))}
      </section>

      {/* Complemento: facturación electrónica */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Facturación electrónica
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Servicio aparte
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Viene incluida en el plan Plus. Si estás en el plan Gratis puedes habilitarla como
              servicio independiente: nos encargamos de la conexión con la DIAN y del envío de las
              facturas a tus clientes.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              {[
                'Numeración y resolución DIAN',
                'Envío automático al correo del cliente',
                'Representación gráfica en PDF',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-emerald-500">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Solicitar facturación electrónica
          </button>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Preguntas frecuentes</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                {faq.question}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <RequestEInvoicingModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  )
}
