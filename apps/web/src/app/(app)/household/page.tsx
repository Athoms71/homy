'use client'

import { useState } from 'react'
import { useMyHouseholds } from '@/hooks/useHousehold'
import { HouseholdCard } from '@/components/modules/household/HouseholdCard'
import { CreateHouseholdForm } from '@/components/modules/household/CreateHouseholdForm'
import { JoinHouseholdForm } from '@/components/modules/household/JoinHouseholdForm'
import { Plus, LogIn, Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState as useStateAlias } from 'react'

export default function HouseholdPage() {
  const { data: households, isLoading, refetch } = useMyHouseholds()
  const [modal, setModal] = useState<'create' | 'join' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  function handleSuccess() {
    setModal(null)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏠 Mes foyers</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos foyers et invitez des membres</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal('join')}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">Rejoindre</span>
          </button>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Créer</span>
          </button>
        </div>
      </div>

      {/* Liste des foyers */}
      {households && households.length > 0 ? (
        <div className="space-y-4">
          {households.map((item: any) => (
            <HouseholdCard
              key={item.households.id}
              household={item.households}
              role={item.role}
              currentUserId={userId ?? ''}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <Home size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="font-semibold text-gray-600 mb-1">Aucun foyer</h2>
          <p className="text-gray-400 text-sm mb-6">Crée ton premier foyer ou rejoins-en un avec un code d'invitation.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setModal('join')}
              className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition"
            >
              Rejoindre avec un code
            </button>
            <button
              onClick={() => setModal('create')}
              className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition"
            >
              Créer un foyer
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {modal === 'create' ? '🏠 Créer un foyer' : '🔑 Rejoindre un foyer'}
            </h2>
            {modal === 'create' ? (
              <CreateHouseholdForm onSuccess={handleSuccess} />
            ) : (
              <JoinHouseholdForm onSuccess={handleSuccess} />
            )}
            <button
              onClick={() => setModal(null)}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition py-2"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
