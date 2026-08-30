import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'O Show — Billetterie événementielle à Lomé',
    template: '%s | O Show',
  },
  description: 'Ton événement. Ton public. Achetez vos billets pour les meilleurs événements à Lomé, Togo.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://oshow.tg'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'O Show',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
