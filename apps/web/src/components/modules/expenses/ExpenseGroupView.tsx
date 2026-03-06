'use client'

import { useState } from 'react'
import { useExpenses, useBalances } from '@/hooks/useExpenses'
import { ExpenseRow } from './ExpenseRow'
import { BalanceSummary } from './BalanceSummary'
import { AddExpenseForm } from './AddExpenseForm'
import { Plus, Loader2, LayoutList, Scale } from 'lucide-react'

interface Member { id: string; name: string }

interface Props {
  group: { id: string; name: string }
  members: Member[]
  currentUserId: string
  onBack: () => void
}

export function ExpenseGroupView({ group, members, currentUserId, onBack }: Props) {
  const [tab, setTab] = useState<'expenses' | 'balances'>('expenses')
  const [showAdd, setShowAdd] = useState(false)
  const { data: expenses = [], isLoading } = useExpenses(group.id)
  const balances = useBalances(group.id, members.map(m => m.id))

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition text-sm">
          ← Retour
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-lg">{group.name}</h2>
          <p className="text-gray-400 text-xs">{expenses.length} dépense{expenses.length > 1 ? 's' : ''} · Total {total.toFixed(2)} €</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('expenses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'expenses' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutList size={15} />
          Dépenses
        </button>
        <button
          onClick={() => setTab('balances')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'balances' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Scale size={15} />
          Bilan
          {balances.length > 0 && (
            <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {balances.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={24} />
        </div>
      ) : tab === 'expenses' ? (
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">💸</p>
              <p className="text-sm">Aucune dépense — ajoutes-en une !</p>
            </div>
          ) : (
            expenses.map((expense: any) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                members={members}
                currentUserId={currentUserId}
                groupId={group.id}
              />
            ))
          )}
        </div>
      ) : (
        <BalanceSummary
          balances={balances}
          members={members}
          currentUserId={currentUserId}
          groupId={group.id}
          expenses={expenses}
        />
      )}

      {/* Modal ajout dépense */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">💸 Nouvelle dépense</h2>
            <AddExpenseForm
              groupId={group.id}
              members={members}
              currentUserId={currentUserId}
              onClose={() => setShowAdd(false)}
            />
            <button onClick={() => setShowAdd(false)} className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
