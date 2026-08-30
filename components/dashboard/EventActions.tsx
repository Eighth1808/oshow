'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface EventActionsProps {
  eventId: string
  status: string
}

export default function EventActions({ eventId, status }: EventActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    const supabase = createClient()

    const updates: Record<string, any> = { status: newStatus }
    if (newStatus === 'published') {
      updates.published_at = new Date().toISOString()
    }

    await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)

    router.refresh()
    setLoading(false)
  }

  if (status === 'draft') {
    return (
      <button
        onClick={() => updateStatus('published')}
        disabled={loading}
        className="btn-primary !py-2 !px-3 !text-sm"
      >
        {loading ? '...' : 'Publier'}
      </button>
    )
  }

  if (status === 'published') {
    return (
      <button
        onClick={() => updateStatus('draft')}
        disabled={loading}
        className="btn-ghost !py-2 !px-3 !text-sm text-yellow-600"
      >
        {loading ? '...' : 'Dépublier'}
      </button>
    )
  }

  return null
}
