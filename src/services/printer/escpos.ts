/**
 * ESC/POS printer service using the Web USB API (Chrome/Edge only).
 * Works with Epson, Bixolon, Sewoo, and most generic thermal USB printers.
 */

// Minimal Web USB types (not in TS standard lib yet)
interface USBEndpoint { endpointNumber: number; direction: 'in' | 'out'; type: 'bulk' | 'interrupt' | 'isochronous' }
interface USBAlternateInterface { endpoints: USBEndpoint[] }
interface USBInterface { interfaceNumber: number; alternates: USBAlternateInterface[] }
interface USBConfiguration { interfaces: USBInterface[] }
interface USBDevice {
  productName?: string
  vendorId: number
  opened: boolean
  configuration: USBConfiguration | null
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: ArrayBuffer | ArrayBufferView): Promise<USBOutTransferResult>
}
interface USBOutTransferResult { bytesWritten: number }

// Common USB Vendor/Product IDs for thermal printers
export const KNOWN_PRINTERS = [
  { vendorId: 0x04b8, label: 'Epson' },
  { vendorId: 0x0dd4, label: 'Bixolon' },
  { vendorId: 0x0fe6, label: 'ICS Advent (generic)' },
  { vendorId: 0x067b, label: 'Prolific USB-Serial' },
  { vendorId: 0x0483, label: 'STMicroelectronics (generic)' },
  { vendorId: 0x154f, label: 'CUSTOM (Sewoo)' },
]

// ESC/POS command bytes
const ESC = 0x1b
const GS = 0x1d

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  FONT_LARGE: [GS, 0x21, 0x11],
  FONT_NORMAL: [GS, 0x21, 0x00],
  FONT_SMALL: [ESC, 0x4d, 0x01],
  CUT: [GS, 0x56, 0x00],
  FEED: [ESC, 0x64, 0x03],
  LF: [0x0a],
}

function str2bytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str))
}

function buildBytes(...parts: (number[] | number)[]): Uint8Array {
  const flat: number[] = []
  for (const p of parts) {
    if (Array.isArray(p)) flat.push(...p)
    else flat.push(p)
  }
  return new Uint8Array(flat)
}

function line(text: string): number[] {
  return [...str2bytes(text), ...CMD.LF]
}

function separator(width: number, char = '-'): number[] {
  return line(char.repeat(width))
}

function padBoth(left: string, right: string, width: number): string {
  const spaces = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(spaces) + right
}

export type EscPosReceiptData = {
  storeName: string
  storeSlogan?: string
  storeNit?: string
  storeAddress?: string
  storePhone?: string
  saleId: string
  date: string
  customerName?: string
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>
  subtotal: number
  tax: number
  discount: number
  total: number
  footerMessage?: string
  footerNote?: string
  /** chars per line: 32 for 58mm, 48 for 80mm */
  charsPerLine?: number
}

export function buildEscPosBuffer(data: EscPosReceiptData): Uint8Array {
  const w = data.charsPerLine ?? 48
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  const bytes: number[] = [
    ...CMD.INIT,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.FONT_LARGE,
    ...line(data.storeName.toUpperCase()),
    ...CMD.FONT_NORMAL,
    ...CMD.BOLD_OFF,
    ...(data.storeSlogan ? line(data.storeSlogan) : []),
    ...(data.storeNit ? line(`NIT: ${data.storeNit}`) : []),
    ...(data.storeAddress ? line(data.storeAddress) : []),
    ...(data.storePhone ? line(`Tel: ${data.storePhone}`) : []),
    ...CMD.LF,
    ...CMD.ALIGN_LEFT,
    ...separator(w),
    ...line(`Factura: ${data.saleId.substring(0, 8).toUpperCase()}`),
    ...line(`Fecha:   ${new Date(data.date).toLocaleString('es-CO')}`),
    ...(data.customerName ? line(`Cliente: ${data.customerName}`) : []),
    ...separator(w),
  ]

  // Items
  for (const item of data.items) {
    const nameW = w - 16
    const name = item.name.length > nameW ? item.name.substring(0, nameW - 1) + '…' : item.name
    bytes.push(...line(name))
    const qtyPrice = `  ${item.quantity} x ${fmt(item.unitPrice)}`
    const total = fmt(item.lineTotal)
    bytes.push(...line(padBoth(qtyPrice, total, w)))
  }

  bytes.push(
    ...separator(w),
    ...line(padBoth('Subtotal:', fmt(data.subtotal), w)),
    ...(data.tax > 0 ? line(padBoth('IVA:', fmt(data.tax), w)) : []),
    ...(data.discount > 0 ? line(padBoth('Descuento:', `-${fmt(data.discount)}`, w)) : []),
    ...CMD.BOLD_ON,
    ...CMD.FONT_LARGE,
    ...line(padBoth('TOTAL:', fmt(data.total), w)),
    ...CMD.FONT_NORMAL,
    ...CMD.BOLD_OFF,
    ...separator(w),
    ...CMD.ALIGN_CENTER,
    ...CMD.LF,
    ...(data.footerMessage ? line(data.footerMessage) : []),
    ...(data.footerNote ? line(data.footerNote) : []),
    ...CMD.LF,
    ...CMD.FEED,
    ...CMD.CUT,
  )

  return buildBytes(...bytes)
}

// ─── Web USB connection ───────────────────────────────────────────────────────

let _device: USBDevice | null = null

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

export async function requestUsbPrinter(): Promise<USBDevice> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usb = (navigator as any).usb
  const device: USBDevice = await usb.requestDevice({
    filters: KNOWN_PRINTERS.map((p) => ({ vendorId: p.vendorId })),
  })
  _device = device
  return device
}

export async function getConnectedPrinter(): Promise<USBDevice | null> {
  if (!isWebUsbSupported()) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usb = (navigator as any).usb
  const devices: USBDevice[] = await usb.getDevices()
  if (devices.length > 0) {
    _device = devices[0]
    return _device
  }
  return null
}

export async function printEscPos(buffer: Uint8Array): Promise<void> {
  if (!_device) {
    const found = await getConnectedPrinter()
    if (!found) throw new Error('No hay impresora USB conectada. Conecta primero en Configuración > Impresora.')
  }

  const dev = _device!
  if (!dev.opened) await dev.open()

  // Select configuration 1
  if (dev.configuration === null) await dev.selectConfiguration(1)

  // Claim the first bulk-OUT interface
  const iface = dev.configuration!.interfaces.find((i: USBInterface) =>
    i.alternates[0].endpoints.some((e: USBEndpoint) => e.direction === 'out' && e.type === 'bulk')
  )
  if (!iface) throw new Error('No se encontró interfaz de impresión en el dispositivo')

  await dev.claimInterface(iface.interfaceNumber)

  const endpoint = iface.alternates[0].endpoints.find(
    (e: USBEndpoint) => e.direction === 'out' && e.type === 'bulk'
  )!

  await dev.transferOut(endpoint.endpointNumber, buffer.buffer as ArrayBuffer)
  await dev.releaseInterface(iface.interfaceNumber)
}

export async function disconnectUsbPrinter(): Promise<void> {
  if (_device?.opened) {
    await _device.close()
  }
  _device = null
}
