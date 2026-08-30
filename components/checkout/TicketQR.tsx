'use client'

import { useEffect, useRef, useState } from 'react'

interface TicketQRProps {
  qrData: string
  isValid: boolean
}

export default function TicketQR({ qrData, isValid }: TicketQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function render() {
      const QRCode = (await import('qrcode')).default
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrData, {
          width: 240,
          margin: 2,
          color: {
            dark: isValid ? '#1a1a1a' : '#9ca3af',
            light: '#ffffff',
          },
        })
        setReady(true)
      }
    }
    render()
  }, [qrData, isValid])

  return (
    <div className="relative">
      <canvas ref={canvasRef} className={ready ? '' : 'hidden'} />
      {!ready && (
        <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg bg-gray-50">
          <span className="text-sm text-gray-400">Chargement du QR...</span>
        </div>
      )}
      {!isValid && ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
            Non valide
          </span>
        </div>
      )}
    </div>
  )
}
