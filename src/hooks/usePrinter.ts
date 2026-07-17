import { useState, useEffect, useCallback } from 'react'
import {
  isWebUsbSupported,
  requestUsbPrinter,
  getConnectedPrinter,
  disconnectUsbPrinter,
  printEscPos,
  buildEscPosBuffer,
  type EscPosReceiptData,
} from '../services/printer/escpos'

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'printing'
export type PrintMode = 'browser' | 'usb'

export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatus>('disconnected')
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<PrintMode>('browser')
  const usbSupported = isWebUsbSupported()

  // On mount, check for already-paired USB printers
  useEffect(() => {
    if (!usbSupported) return
    getConnectedPrinter().then((dev) => {
      if (dev) {
        setStatus('connected')
        setDeviceName(`${dev.productName || 'Impresora USB'} (${dev.vendorId.toString(16)})`)
      }
    })
  }, [usbSupported])

  const connectUsb = useCallback(async () => {
    setError(null)
    setStatus('connecting')
    try {
      const dev = await requestUsbPrinter()
      setStatus('connected')
      setDeviceName(`${dev.productName || 'Impresora USB'} (${dev.vendorId.toString(16)})`)
      setMode('usb')
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        setStatus('disconnected')
      } else {
        setStatus('error')
        setError(err?.message ?? 'Error al conectar la impresora')
      }
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectUsbPrinter()
    setStatus('disconnected')
    setDeviceName(null)
  }, [])

  const printUsb = useCallback(async (data: EscPosReceiptData) => {
    setStatus('printing')
    try {
      const buffer = buildEscPosBuffer(data)
      await printEscPos(buffer)
      setStatus('connected')
    } catch (err: any) {
      setStatus('error')
      setError(err?.message ?? 'Error al imprimir')
    }
  }, [])

  return {
    status,
    deviceName,
    error,
    mode,
    setMode,
    usbSupported,
    connectUsb,
    disconnect,
    printUsb,
  }
}
