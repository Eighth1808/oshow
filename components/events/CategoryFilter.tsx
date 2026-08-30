'use client'

import { EVENT_CATEGORY_LABELS, type EventCategory } from '@/types'

interface CategoryFilterProps {
  selected: EventCategory | null
  onChange: (category: EventCategory | null) => void
}

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

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories = Object.entries(EVENT_CATEGORY_LABELS) as [EventCategory, string][]

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          selected === null
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Tout
      </button>
      {categories.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(selected === key ? null : key)}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selected === key
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>{CATEGORY_ICONS[key]}</span>
          {label}
        </button>
      ))}
    </div>
  )
}
