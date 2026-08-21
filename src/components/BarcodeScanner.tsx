import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

type Props = {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeRef = useRef(true)
  const readerRef = useRef(new BrowserMultiFormatReader())

  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)

  // 1. Cargar lista de cámaras al montar
  useEffect(() => {
    // Primero pedir permiso para que los labels aparezcan
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((tempStream) => {
        tempStream.getTracks().forEach((t) => t.stop())
        return navigator.mediaDevices.enumerateDevices()
      })
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        setCameras(videoDevices)
        // Preferir cámara trasera (environment / back / rear)
        const back = videoDevices.find((d) =>
          /back|rear|environment|trasera/i.test(d.label),
        )
        setSelectedCamera(back?.deviceId ?? videoDevices[0]?.deviceId)
      })
      .catch((e) => {
        if (e?.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
        } else {
          setError('No se encontraron cámaras disponibles.')
        }
      })

    return () => {
      activeRef.current = false
    }
  }, [])

  // 2. Iniciar stream y loop de escaneo cuando se conoce la cámara
  useEffect(() => {
    if (!selectedCamera) return

    activeRef.current = true
    let timeoutId: ReturnType<typeof setTimeout>

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    const startStream = async () => {
      stopStream()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCamera },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (!activeRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play()

        // Loop de escaneo: intenta decodificar cada 300ms
        const decode = async () => {
          if (!activeRef.current || !video) return
          try {
            const result = await readerRef.current.decodeFromVideoElement(video)
            if (result && activeRef.current) {
              onDetected(result.getText())
              return // dejar de escanear tras éxito
            }
          } catch (e) {
            if (!(e instanceof NotFoundException)) {
              console.warn('[BarcodeScanner]', e)
            }
          }
          // Programar siguiente intento
          if (activeRef.current) {
            timeoutId = setTimeout(decode, 300)
          }
        }

        decode()
      } catch (e: any) {
        if (e?.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
        } else if (e?.name === 'NotFoundError') {
          setError('No se encontró la cámara seleccionada.')
        } else {
          setError('No se pudo iniciar la cámara. Intenta recargar la página.')
        }
      }
    }

    startStream()

    return () => {
      activeRef.current = false
      clearTimeout(timeoutId)
      stopStream()
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

        {error ? (
          /* ── Estado de error ── */
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
            {/* ── Viewfinder ── */}
            <div className="relative overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Marco de guía */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-40 w-64">
                  <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-2 border-t-2 border-blue-400" />
                  <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-2 border-t-2 border-blue-400" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-2 border-l-2 border-blue-400" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-blue-400" />
                  {/* Línea de escaneo animada */}
                  <span className="scan-line absolute left-1 right-1 h-0.5 rounded-full bg-blue-400/80" />
                </div>
              </div>
            </div>

            <p className="px-4 py-2 text-center text-xs text-slate-400">
              Apunta la cámara al código de barras del producto
            </p>

            {/* Selector de cámara si hay más de una */}
            {cameras.length > 1 && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Cámara
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => {
                    activeRef.current = false
                    setSelectedCamera(e.target.value)
                    setTimeout(() => { activeRef.current = true }, 50)
                  }}
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
          top: 8px;
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
