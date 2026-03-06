'use client'

import Link from 'next/link'
import { useMyHouseholds, useHouseholdMembers } from '@/hooks/useHousehold'
import { ArrowRight, Users } from 'lucide-react'

function MemberAvatars({ householdId }: { householdId: string }) {
  const { data: members = [] } = useHouseholdMembers(householdId)

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((m: any) => (
          <div
            key={m.profiles.id}
            className="w-7 h-7 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-primary-700 text-xs font-bold"
            title={m.profiles.name}
          >
            {m.profiles.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        ))}
        {members.length > 4 && (
          <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold">
            +{members.length - 4}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500">
        {members.length} membre{members.length > 1 ? 's' : ''}
      </span>
    </div>
  )
}

export function HouseholdWidget() {
  const { data: households = [], isLoading } = useMyHouseholds()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏠</span>
          <h2 className="font-bold text-gray-800">Mon foyer</h2>
        </div>
        <Link href="/household" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
          Gérer <ArrowRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ) : households.length === 0 ? (
        <div className="text-center py-4">
          <Users size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">Aucun foyer</p>
          <Link href="/household" className="text-primary-600 text-xs hover:underline">
            Créer un foyer →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {households.slice(0, 2).map((item: any) => (
            <div key={item.households.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div>
                <p className="font-medium text-gray-800 text-sm">{item.households.name}</p>
                <p className="text-xs text-gray-400 capitalize">{item.role === 'admin' ? '👑 Admin' : '👤 Membre'}</p>
              </div>
              <MemberAvatars householdId={item.households.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
