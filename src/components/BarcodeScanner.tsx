import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import type { IScannerControls } from '@zxing/browser'

type Props = {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
  const controlsRef = useRef<IScannerControls | null>(null)

  // Cargar lista de cámaras disponibles
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices)
        // Preferir cámara trasera en móviles
        const back = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment'),
        )
        setSelectedCamera(back?.deviceId ?? devices[0]?.deviceId)
      })
      .catch(() => setError('No se pudo acceder a las cámaras.'))
  }, [])

  // Iniciar/reiniciar el escaneo al cambiar cámara
  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return

    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err, controls) => {
        if (result) {
          controls.stop()
          onDetected(result.getText())
        }
        if (err && !(err instanceof NotFoundException)) {
          // NotFoundException es normal (aún buscando), ignorar
          console.warn(err)
        }
      })
      .then((controls) => {
        controlsRef.current = controls
      })
      .catch((e) => {
        if (e?.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
        } else {
          setError('No se pudo iniciar la cámara.')
        }
      })

    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [selectedCamera])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">📷</span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Escanear código de barras
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        {error ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Viewfinder */}
            <div className="relative bg-black">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover"
                muted
                playsInline
                autoPlay
              />
              {/* Marco de guía */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-40 w-64">
                  {/* Esquinas del marco */}
                  <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-2 border-t-2 border-blue-400" />
                  <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-2 border-t-2 border-blue-400" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-2 border-l-2 border-blue-400" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-blue-400" />
                  {/* Línea de escaneo animada */}
                  <span className="scan-line absolute left-1 right-1 h-0.5 bg-blue-400/80" />
                </div>
              </div>
            </div>

            <p className="px-4 py-2 text-center text-xs text-slate-400">
              Apunta la cámara al código de barras del producto
            </p>

            {/* Selector de cámara (si hay más de una) */}
            {cameras.length > 1 && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Cámara
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Cámara ${cam.deviceId.substring(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <button
                onClick={onClose}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .scan-line {
          top: 50%;
          animation: scan 1.8s ease-in-out infinite;
        }
        @keyframes scan {
          0%   { top: 8px;   opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 0.6; }
          100% { top: 8px;   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
