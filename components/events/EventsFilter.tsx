'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import CategoryFilter from './CategoryFilter'
import type { EventCategory } from '@/types'

interface EventsFilterProps {
  initialCategory: EventCategory | null
  initialQuery?: string
}

export default function EventsFilter({ initialCategory, initialQuery }: EventsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery || '')

  const updateFilters = useCallback(
    (category: EventCategory | null, q?: string) => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (q) params.set('q', q)
      router.push(`/events${params.toString() ? `?${params.toString()}` : ''}`)
    },
    [router]
  )

  function handleCategoryChange(category: EventCategory | null) {
    updateFilters(category, query || undefined)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const currentCategory = searchParams.get('category') as EventCategory | null
    updateFilters(currentCategory, query || undefined)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un événement..."
          className="input-field !py-3 !pl-12"
        />
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </form>

      <CategoryFilter selected={initialCategory} onChange={handleCategoryChange} />
    </div>
  )
}
