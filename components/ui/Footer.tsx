import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary-500">O</span>
              <span className="text-xl font-bold text-gray-900">Show</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              Ton événement. Ton public.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Découvrir</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/events" className="text-sm text-gray-500 hover:text-primary-500">Événements</Link></li>
              <li><Link href="/events?category=concert" className="text-sm text-gray-500 hover:text-primary-500">Concerts</Link></li>
              <li><Link href="/events?category=conference" className="text-sm text-gray-500 hover:text-primary-500">Conférences</Link></li>
              <li><Link href="/events?category=soiree" className="text-sm text-gray-500 hover:text-primary-500">Soirées</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Organisateurs</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/dashboard/events/new" className="text-sm text-gray-500 hover:text-primary-500">Créer un événement</Link></li>
              <li><Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary-500">Tableau de bord</Link></li>
              <li><Link href="/dashboard/payouts" className="text-sm text-gray-500 hover:text-primary-500">Paiements</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Aide</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/contact" className="text-sm text-gray-500 hover:text-primary-500">Contact</Link></li>
              <li><Link href="/faq" className="text-sm text-gray-500 hover:text-primary-500">FAQ</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-500 hover:text-primary-500">Conditions d&apos;utilisation</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 sm:flex-row">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} O Show. Tous droits réservés.
          </p>
          <p className="text-sm text-gray-400">
            Propulsé par{' '}
            <a
              href="https://sugitech.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary-500 hover:text-primary-600"
            >
              SugiTech
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
