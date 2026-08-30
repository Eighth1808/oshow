'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ScanResult } from '@/types'

interface QRScannerProps {
  eventId: string
  onScanResult: (result: ScanResult) => void
}

export default function QRScanner({ eventId, onScanResult }: QRScannerProps) {
  const scannerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const lastScannedRef = useRef<string>('')
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  const handleScan = useCallback(async (decodedText: string) => {
    if (processing) return
    if (decodedText === lastScannedRef.current) return

    lastScannedRef.current = decodedText
    setProcessing(true)

    let ticketCode = decodedText
    const match = decodedText.match(/\/t\/([A-Z0-9]+)$/i)
    if (match) {
      ticketCode = match[1]
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode, eventId }),
      })

      const data = await res.json()
      onScanResult(data as ScanResult)
    } catch {
      onScanResult({
        success: false,
        result: 'invalid',
        ticket: null,
        message: 'Erreur réseau',
      })
    } finally {
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
      cooldownRef.current = setTimeout(() => {
        lastScannedRef.current = ''
        setProcessing(false)
      }, 3000)
    }
  }, [eventId, onScanResult, processing])

  useEffect(() => {
    let html5QrCode: any = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        html5QrCode = new Html5Qrcode('qr-reader')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText: string) => handleScan(decodedText),
          () => {},
        )
        setScanning(true)
        setError(null)
      } catch (err) {
        setError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      }
    }

    startScanner()

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {})
      }
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
    }
  }, [handleScan])

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        id="qr-reader"
        className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-black"
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {processing && (
        <div className="text-center text-sm text-gray-500">
          Vérification en cours...
        </div>
      )}

      {scanning && !processing && (
        <div className="text-center text-sm text-gray-500">
          Pointez la caméra vers un QR code de billet
        </div>
      )}
    </div>
  )
}
