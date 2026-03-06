'use client'

import { useState } from 'react'
import { Copy, Check, RefreshCw, LogOut, Users, Crown } from 'lucide-react'
import { useHouseholdMembers, useRegenerateInviteCode, useLeaveHousehold } from '@/hooks/useHousehold'

interface Props {
  household: {
    id: string
    name: string
    invite_code: string
    created_by: string
  }
  role: string
  currentUserId: string
}

export function HouseholdCard({ household, role, currentUserId }: Props) {
  const [copied, setCopied] = useState(false)
  const { data: members } = useHouseholdMembers(household.id)
  const regenerate = useRegenerateInviteCode()
  const leave = useLeaveHousehold()

  function copyCode() {
    navigator.clipboard.writeText(household.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLeave() {
    if (!confirm(`Quitter le foyer "${household.name}" ?`)) return
    leave.mutate(household.id)
  }

  function handleRegenerate() {
    if (!confirm('Générer un nouveau code ? L\'ancien ne fonctionnera plus.')) return
    regenerate.mutate(household.id)
  }

  const isAdmin = role === 'admin'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">{household.name}</h2>
          <span className="text-primary-200 text-xs capitalize">
            {isAdmin ? '👑 Admin' : '👤 Membre'}
          </span>
        </div>
        <button
          onClick={handleLeave}
          disabled={leave.isPending}
          className="text-primary-200 hover:text-white transition p-1"
          title="Quitter le foyer"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Invite code */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Code d'invitation</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-widest text-primary-700 bg-primary-50 px-4 py-2 rounded-lg flex-1 text-center">
            {household.invite_code}
          </span>
          <button
            onClick={copyCode}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            title="Copier"
          >
            {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-gray-600" />}
          </button>
          {isAdmin && (
            <button
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              title="Nouveau code"
            >
              <RefreshCw size={18} className={`text-gray-600 ${regenerate.isPending ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <p className="text-gray-400 text-xs mt-2">Partage ce code pour inviter quelqu'un dans ton foyer</p>
      </div>

      {/* Members */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={15} className="text-gray-400" />
          <p className="text-xs font-medium text-gray-500">
            {members?.length ?? 0} membre{(members?.length ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <div className="space-y-2">
          {members?.map((m: any) => {
            const profile = m.profiles
            const isCurrentUser = profile?.id === currentUserId
            return (
              <div key={profile?.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">
                    {profile?.name}
                    {isCurrentUser && <span className="text-gray-400 font-normal"> (moi)</span>}
                  </span>
                </div>
                {m.role === 'admin' && <Crown size={14} className="text-yellow-500" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
