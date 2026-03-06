import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const name = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'vous'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {name} 👋</h1>
        <p className="text-gray-500 mt-1">Voici un aperçu de votre foyer.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          emoji="🛒"
          title="Courses"
          description="Aucune liste active"
          href="/shopping"
          color="blue"
        />
        <DashboardCard
          emoji="💸"
          title="Soldes"
          description="Tout est à jour"
          href="/expenses"
          color="green"
        />
        <DashboardCard
          emoji="📄"
          title="Factures"
          description="Aucune échéance proche"
          href="/bills"
          color="orange"
        />
      </div>
    </div>
  )
}

function DashboardCard({
  emoji, title, description, href, color,
}: {
  emoji: string
  title: string
  description: string
  href: string
  color: 'blue' | 'green' | 'orange'
}) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 hover:border-blue-400',
    green:  'bg-green-50 border-green-200 hover:border-green-400',
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  }

  return (
    <a
      href={href}
      className={`block rounded-2xl border-2 p-5 transition ${colors[color]}`}
    >
      <div className="text-3xl mb-3">{emoji}</div>
      <h2 className="font-semibold text-gray-800 text-lg">{title}</h2>
      <p className="text-gray-500 text-sm mt-1">{description}</p>
    </a>
  )
}
