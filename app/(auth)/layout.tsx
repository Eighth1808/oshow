import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="text-3xl font-bold text-primary-500">O</span>
        <span className="text-2xl font-bold text-gray-900">Show</span>
      </Link>
      {children}
      <p className="mt-8 text-center text-xs text-gray-400">
        Propulsé par{' '}
        <a href="https://sugitech.com" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">
          SugiTech
        </a>
      </p>
    </div>
  )
}
