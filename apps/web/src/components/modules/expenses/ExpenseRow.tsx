'use client'

import { useDeleteExpense } from '@/hooks/useExpenses'
import { getExpenseCategoryInfo } from '@/lib/expenseCategories'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Member { id: string; name: string }

interface Props {
  expense: {
    id: string
    description: string
    amount: number
    paid_by: string
    category: string
    date: string
    expense_splits: { id: string; user_id: string; amount: number; is_paid: boolean }[]
  }
  members: Member[]
  currentUserId: string
  groupId: string
}

export function ExpenseRow({ expense, members, currentUserId, groupId }: Props) {
  const remove = useDeleteExpense(groupId)
  const cat = getExpenseCategoryInfo(expense.category as any)

  function getName(id: string) {
    return id === currentUserId ? 'moi' : (members.find(m => m.id === id)?.name ?? '?')
  }

  const myShare = expense.expense_splits.find(s => s.user_id === currentUserId)
  const iPaid = expense.paid_by === currentUserId

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition group">
      {/* Emoji */}
      <span className="text-2xl flex-shrink-0">{cat.emoji}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate">{expense.description}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          Payé par <span className="font-medium text-gray-500">{getName(expense.paid_by)}</span>
          {' · '}
          {format(new Date(expense.date), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Ma part */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-gray-800 text-sm">{expense.amount.toFixed(2)} €</p>
        {myShare && !iPaid && (
          <p className={`text-xs ${myShare.is_paid ? 'text-green-500' : 'text-orange-500'}`}>
            {myShare.is_paid ? '✓ remboursé' : `ma part : ${myShare.amount.toFixed(2)} €`}
          </p>
        )}
        {iPaid && (
          <p className="text-xs text-primary-500">tu as payé</p>
        )}
      </div>

      {/* Supprimer */}
      <button
        onClick={() => {
          if (confirm('Supprimer cette dépense ?')) remove.mutate(expense.id)
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
