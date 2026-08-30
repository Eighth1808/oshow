'use client'

import Link from 'next/link'
import { EVENT_CATEGORY_LABELS, type EventCategory } from '@/types'

const CATEGORY_ICONS: Record<EventCategory, string> = {
  concert: '🎵',
  conference: '🎤',
  soiree: '🌙',
  festival: '🎪',
  mariage: '💍',
  sport: '⚽',
  formation: '📚',
  spectacle: '🎭',
  religieux: '🙏',
  corporate: '💼',
  autre: '✨',
}

const POPULAR_CATEGORIES: EventCategory[] = [
  'concert', 'soiree', 'conference', 'festival', 'sport', 'spectacle', 'formation', 'mariage'
]

export default function HomeCategories() {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
      {POPULAR_CATEGORIES.map((key) => (
        <Link
          key={key}
          href={`/events?category=${key}`}
          className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-primary-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-2xl">
            {CATEGORY_ICONS[key]}
          </span>
          <span className="text-xs font-medium text-gray-600">
            {EVENT_CATEGORY_LABELS[key]}
          </span>
        </Link>
      ))}
    </div>
  )
}
