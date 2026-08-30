import Link from 'next/link'
import Image from 'next/image'
import { formatDate, formatTime } from '@/lib/utils'
import { formatFCFA } from '@/lib/fees'
import type { Event } from '@/types'

interface EventCardProps {
  event: Pick<Event, 'slug' | 'title' | 'cover_image_url' | 'starts_at' | 'venue_name' | 'venue_city' | 'category' | 'is_free'> & {
    min_price?: number
  }
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/e/${event.slug}`} className="group block">
      <div className="card overflow-hidden !p-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
              <span className="text-4xl">🎉</span>
            </div>
          )}
          <span className="badge-primary absolute left-3 top-3 capitalize">
            {event.category}
          </span>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(event.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })} &middot; {formatTime(event.starts_at)}
          </div>

          <h3 className="mb-2 text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-500">
            {event.title}
          </h3>

          {event.venue_name && (
            <div className="mb-3 flex items-center gap-1 text-xs text-gray-500">
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.venue_name}, {event.venue_city}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">
              {event.is_free ? 'Gratuit' : `À partir de ${formatFCFA(event.min_price || 0)}`}
            </span>
            <span className="text-xs font-medium text-primary-500 opacity-0 transition-opacity group-hover:opacity-100">
              Voir &rarr;
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
