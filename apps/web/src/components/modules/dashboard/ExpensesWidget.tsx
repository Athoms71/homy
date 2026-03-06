'use client'

import Link from 'next/link'
import { useExpenseGroups, useExpenses, useBalances } from '@/hooks/useExpenses'
import { ArrowRight, CheckCircle } from 'lucide-react'

interface Props {
  householdId: string
  currentUserId: string
  memberIds: string[]
}

function GroupBalancePreview({
  group,
  currentUserId,
  memberIds,
}: {
  group: { id: string; name: string }
  currentUserId: string
  memberIds: string[]
}) {
  const balances = useBalances(group.id, memberIds)
  const myDebts = balances.filter(b => b.fromUserId === currentUserId)
  const iOwe = myDebts.reduce((sum, b) => sum + b.amount, 0)

  return (
    <div className="bg-green-50 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 truncate">{group.name}</span>
        {iOwe > 0 ? (
          <span className="text-orange-600 font-bold text-sm flex-shrink-0 ml-2">
            -{iOwe.toFixed(2)} €
          </span>
        ) : (
          <span className="text-green-600 text-xs flex items-center gap-1 flex-shrink-0 ml-2">
            <CheckCircle size={12} /> À jour
          </span>
        )}
      </div>
      {myDebts.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {myDebts.slice(0, 2).map((b, i) => (
            <p key={i} className="text-xs text-orange-500">
              Tu dois {b.amount.toFixed(2)} € à quelqu'un
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export function ExpensesWidget({ householdId, currentUserId, memberIds }: Props) {
  const { data: groups = [], isLoading } = useExpenseGroups(householdId)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">💸</span>
          <h2 className="font-bold text-gray-800">Soldes</h2>
        </div>
        <Link href="/expenses" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
          Voir tout <ArrowRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ) : groups.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">Aucun groupe de dépenses</p>
          <Link href="/expenses" className="text-primary-600 text-xs hover:underline">
            Créer un groupe →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.slice(0, 2).map((group: any) => (
            <GroupBalancePreview
              key={group.id}
              group={group}
              currentUserId={currentUserId}
              memberIds={memberIds}
            />
          ))}
          {groups.length > 2 && (
            <p className="text-xs text-gray-400 text-center">
              +{groups.length - 2} autre{groups.length - 2 > 1 ? 's' : ''} groupe{groups.length - 2 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
