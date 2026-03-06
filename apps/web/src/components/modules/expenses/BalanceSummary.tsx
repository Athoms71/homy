'use client'

import { useMarkSplitAsPaid } from '@/hooks/useExpenses'
import type { Balance } from '@/services/expenses.service'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  name: string
}

interface Props {
  balances: Balance[]
  members: Member[]
  currentUserId: string
  groupId: string
  expenses: any[]
}

export function BalanceSummary({ balances, members, currentUserId, groupId, expenses }: Props) {
  const markPaid = useMarkSplitAsPaid(groupId)

  function getName(id: string) {
    return id === currentUserId ? 'Moi' : (members.find(m => m.id === id)?.name ?? 'Inconnu')
  }

  // Trouver le split ID correspondant pour marquer comme payé
  function findSplitId(fromUserId: string, toUserId: string) {
    for (const expense of expenses) {
      if (expense.paid_by !== toUserId) continue
      const split = expense.expense_splits?.find(
        (s: any) => s.user_id === fromUserId && !s.is_paid
      )
      if (split) return split.id
    }
    return null
  }

  if (balances.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-2" size={28} />
        <p className="font-semibold text-green-700">Tout est à jour !</p>
        <p className="text-green-600 text-sm mt-1">Aucune dette en cours dans ce groupe.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700 text-sm">Bilan — qui doit à qui</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {balances.map((b, i) => {
          const isMe = b.fromUserId === currentUserId
          const splitId = findSplitId(b.fromUserId, b.toUserId)
          return (
            <div key={i} className={cn('flex items-center gap-3 px-5 py-3.5', isMe && 'bg-orange-50')}>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className={cn('text-sm font-semibold', isMe ? 'text-orange-700' : 'text-gray-700')}>
                  {getName(b.fromUserId)}
                </span>
                <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">{getName(b.toUserId)}</span>
              </div>
              <span className={cn('font-bold text-sm flex-shrink-0', isMe ? 'text-orange-600' : 'text-gray-700')}>
                {b.amount.toFixed(2)} €
              </span>
              {isMe && splitId && (
                <button
                  onClick={() => markPaid.mutate(splitId)}
                  disabled={markPaid.isPending}
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition flex-shrink-0"
                >
                  Rembourser
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
