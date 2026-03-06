import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Paramètres</h1>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-4">
          <h2 className="font-medium text-gray-700 mb-1">Foyer</h2>
          <p className="text-gray-400 text-sm">Gérer les membres et invitations — bientôt disponible</p>
        </div>
        <div className="p-4">
          <h2 className="font-medium text-gray-700 mb-1">Profil</h2>
          <p className="text-gray-400 text-sm">Modifier vos informations — bientôt disponible</p>
        </div>
        <div className="p-4">
          <form action={signOut}>
            <button
              type="submit"
              className="text-red-600 font-medium text-sm hover:underline"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
