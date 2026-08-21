export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'capsulasofware@gmail.com'
export const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP || '573186025827' // Número de WhatsApp por defecto o configurable

export function openSupportWhatsApp(storeName?: string | null, userName?: string | null, reason = 'activar suscripción') {
  const digits = SUPPORT_WHATSAPP.replace(/\D/g, '')
  const msg = `Hola Soporte Cápsula 👋, me comunico desde el establecimiento "${storeName || 'Mi Negocio'}" (${userName || 'Usuario'}). Quisiera ${reason} y continuar usando el sistema.`
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
