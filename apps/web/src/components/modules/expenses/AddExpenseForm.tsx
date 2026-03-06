'use client'

import { useState } from 'react'
import { useAddExpense } from '@/hooks/useExpenses'
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExpenseCategory } from '@homy/shared-types'

interface Member {
  id: string
  name: string
}

interface Props {
  groupId: string
  members: Member[]
  currentUserId: string
  onClose: () => void
}

export function AddExpenseForm({ groupId, members, currentUserId, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [selectedIds, setSelectedIds] = useState<string[]>(members.map(m => m.id))
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})

  const { mutate, isPending } = useAddExpense(groupId)

  function toggleMember(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Validation custom splits
  const customTotal = Object.values(customAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const amountNum = parseFloat(amount) || 0
  const customValid = splitMode === 'equal' || Math.abs(customTotal - amountNum) < 0.01

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amountNum || selectedIds.length === 0) return

    const finalCustomAmounts: Record<string, number> = {}
    if (splitMode === 'custom') {
      selectedIds.forEach(id => {
        finalCustomAmounts[id] = parseFloat(customAmounts[id] ?? '0') || 0
      })
    }

    mutate(
      { description: description.trim(), amount: amountNum, paidBy, category, date, splitUserIds: selectedIds, splitMode, customAmounts: finalCustomAmounts },
      { onSuccess: onClose }
    )
  }

  const perPerson = selectedIds.length > 0 ? Math.round((amountNum / selectedIds.length) * 100) / 100 : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Courses, restaurant, loyer..."
          autoFocus
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Montant + date */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            required
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Payé par */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payé par</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidBy(m.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition',
                paidBy === m.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {m.name}{m.id === currentUserId ? ' (moi)' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
        <div className="grid grid-cols-4 gap-2">
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition',
                category === cat.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-center leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Répartir entre</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMember(m.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition',
                selectedIds.includes(m.id)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {m.name}{m.id === currentUserId ? ' (moi)' : ''}
            </button>
          ))}
        </div>

        {/* Mode de split */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setSplitMode('equal')}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-medium transition border-2',
              splitMode === 'equal' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'
            )}
          >
            Égal {amountNum > 0 && selectedIds.length > 0 && `(${perPerson} €/pers)`}
          </button>
          <button
            type="button"
            onClick={() => setSplitMode('custom')}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-medium transition border-2',
              splitMode === 'custom' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'
            )}
          >
            Personnalisé
          </button>
        </div>

        {/* Montants custom */}
        {splitMode === 'custom' && (
          <div className="space-y-2">
            {selectedIds.map(id => {
              const member = members.find(m => m.id === id)
              return (
                <div key={id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 flex-1">{member?.name}</span>
                  <input
                    type="number"
                    value={customAmounts[id] ?? ''}
                    onChange={e => setCustomAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-400">€</span>
                </div>
              )
            })}
            <div className={cn(
              'text-xs font-medium text-right mt-1',
              customValid ? 'text-green-600' : 'text-red-500'
            )}>
              Total : {customTotal.toFixed(2)} € / {amountNum.toFixed(2)} €
              {!customValid && ' — doit être égal au montant'}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !description.trim() || !amountNum || selectedIds.length === 0 || !customValid}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        {isPending ? 'Ajout...' : 'Ajouter la dépense'}
      </button>
    </form>
  )
}
