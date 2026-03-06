import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 text-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-2">🏠 Homy</h1>
        <p className="text-primary-200 text-xl mb-2">Home Monitoring</p>
        <p className="text-primary-100 mb-10">
          Gérez vos courses, dépenses partagées et factures en un seul endroit.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition"
          >
            Créer un compte
          </Link>
          <Link
            href="/login"
            className="border border-white text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  )
}
