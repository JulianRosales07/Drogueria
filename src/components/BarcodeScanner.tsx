import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

type Props = {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)

  // 1. Obtener lista de cámaras
  useEffect(() => {
    let mounted = true

    async function initCameras() {
      try {
        // Pedir permiso inicial para desbloquear las etiquetas de los dispositivos
        const initialStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        // Cerrar stream inicial inmediatamente
        initialStream.getTracks().forEach((t) => t.stop())

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!mounted) return

        const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        setCameras(videoDevices)

        // Seleccionar cámara trasera por defecto
        const back = videoDevices.find((d) =>
          /back|rear|environment|trasera/i.test(d.label),
        )
        setSelectedCamera(back?.deviceId ?? videoDevices[0]?.deviceId)
      } catch (e: any) {
        if (!mounted) return
        if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
          setError('Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador.')
        } else {
          setError('No se pudo acceder a la cámara en este dispositivo.')
        }
      }
    }

    initCameras()

    return () => {
      mounted = false
    }
  }, [])

  // 2. Iniciar el stream de video y el lector de códigos de barras
  useEffect(() => {
    let isCancelled = false

    async function startScanning() {
      // Limpiar stream y controles anteriores
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      const video = videoRef.current
      if (!video) return

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCamera
            ? { deviceId: { exact: selectedCamera } }
            : { facingMode: { ideal: 'environment' } },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true

        try {
          await video.play()
        } catch {
          // Ignorar error si ya se está reproduciendo
        }

        const codeReader = new BrowserMultiFormatReader()
        const controls = await codeReader.decodeFromStream(
          stream,
          video,
          (result, err, activeControls) => {
            if (result) {
              const text = result.getText()
              if (text) {
                activeControls.stop()
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((t) => t.stop())
                  streamRef.current = null
                }
                onDetected(text)
              }
            }
            if (err && !(err instanceof NotFoundException)) {
              console.warn('[BarcodeScanner]', err)
            }
          },
        )

        if (isCancelled) {
          controls.stop()
        } else {
          controlsRef.current = controls
        }
      } catch (e: any) {
        if (isCancelled) return
        if (e?.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado.')
        } else {
          setError('Error al iniciar la transmisión de video de la cámara.')
        }
      }
    }

    startScanning()

    return () => {
      isCancelled = true
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [selectedCamera])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
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
          /* Estado de error */
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
            <div className="relative min-h-64 overflow-hidden bg-black flex items-center justify-center">
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
