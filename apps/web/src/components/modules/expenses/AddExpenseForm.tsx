'use client'

import { useState, useEffect } from 'react'
import { useAddExpense } from '@/hooks/useExpenses'
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories'
import { Loader2, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExpenseCategory } from '@homy/shared-types'

interface Member { id: string; name: string }

interface Props {
  groupId: string
  members: Member[]
  currentUserId: string
  onClose: () => void
}

type SplitMode = 'equal' | 'shares' | 'custom'

export function AddExpenseForm({ groupId, members, currentUserId, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [selectedIds, setSelectedIds] = useState<string[]>(members.map(m => m.id))
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, '1']))
  )

  const { mutate, isPending } = useAddExpense(groupId)

  const amountNum = parseFloat(amount) || 0

  // Sélectionner / désélectionner tous
  const allSelected = selectedIds.length === members.length
  function toggleAll() {
    setSelectedIds(allSelected ? [] : members.map(m => m.id))
  }
  function toggleMember(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Calcul montant par personne (equal)
  const perPerson = selectedIds.length > 0 ? Math.round((amountNum / selectedIds.length) * 100) / 100 : 0

  // Calcul montant par parts
  const totalShares = selectedIds.reduce((sum, id) => sum + (parseFloat(shares[id]) || 0), 0)
  function getShareAmount(id: string) {
    if (totalShares === 0) return 0
    return Math.round((amountNum * (parseFloat(shares[id]) || 0) / totalShares) * 100) / 100
  }

  // Validation custom
  const customTotal = Object.entries(customAmounts)
    .filter(([id]) => selectedIds.includes(id))
    .reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0)
  const customValid = splitMode !== 'custom' || Math.abs(customTotal - amountNum) < 0.01

  // Auto-calcul des montants custom restants quand on tape
  function handleCustomChange(id: string, val: string) {
    setCustomAmounts(prev => {
      const next = { ...prev, [id]: val }
      // Recalculer les autres non modifiés si possible
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amountNum || selectedIds.length === 0) return

    let finalCustomAmounts: Record<string, number> = {}
    let finalSplitMode: 'equal' | 'custom' = 'equal'

    if (splitMode === 'equal') {
      finalSplitMode = 'equal'
    } else if (splitMode === 'shares') {
      finalSplitMode = 'custom'
      selectedIds.forEach(id => { finalCustomAmounts[id] = getShareAmount(id) })
    } else {
      finalSplitMode = 'custom'
      selectedIds.forEach(id => { finalCustomAmounts[id] = parseFloat(customAmounts[id] ?? '0') || 0 })
    }

    mutate(
      { description: description.trim(), amount: amountNum, paidBy, category, date, splitUserIds: selectedIds, splitMode: finalSplitMode, customAmounts: finalCustomAmounts },
      { onSuccess: onClose }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Courses, restaurant, loyer..." autoFocus required
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Montant + date */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" min="0.01" step="0.01" required
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Payé par */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payé par</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button key={m.id} type="button" onClick={() => setPaidBy(m.id)}
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
            <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
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

      {/* Participants — checkboxes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Participants</label>
          <button type="button" onClick={toggleAll}
            className="text-xs text-primary-600 hover:underline"
          >
            {allSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
          </button>
        </div>
        <div className="space-y-2">
          {members.map(m => (
            <label key={m.id} className="flex items-center gap-3 cursor-pointer py-1">
              <div
                onClick={() => toggleMember(m.id)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0',
                  selectedIds.includes(m.id)
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-gray-300'
                )}
              >
                {selectedIds.includes(m.id) && <Check size={12} className="text-white" />}
              </div>
              <span className="text-sm text-gray-700">
                {m.name}{m.id === currentUserId ? ' (moi)' : ''}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Mode de répartition — select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Répartition</label>
        <select
          value={splitMode}
          onChange={e => setSplitMode(e.target.value as SplitMode)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="equal">Équitable {amountNum > 0 && selectedIds.length > 0 ? `(${perPerson} €/pers)` : ''}</option>
          <option value="shares">Par parts</option>
          <option value="custom">Montant personnalisé</option>
        </select>
      </div>

      {/* Détail répartition par parts */}
      {splitMode === 'shares' && (
        <div className="space-y-2">
          {selectedIds.map(id => {
            const member = members.find(m => m.id === id)
            return (
              <div key={id} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 flex-1">{member?.name}</span>
                <input
                  type="number" value={shares[id] ?? '1'}
                  onChange={e => setShares(prev => ({ ...prev, [id]: e.target.value }))}
                  placeholder="1" min="0" step="0.5"
                  className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-400 w-16 text-right">= {getShareAmount(id).toFixed(2)} €</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Montants custom */}
      {splitMode === 'custom' && (
        <div className="space-y-2">
          {selectedIds.map(id => {
            const member = members.find(m => m.id === id)
            return (
              <div key={id} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 flex-1">{member?.name}</span>
                <input
                  type="number" value={customAmounts[id] ?? ''}
                  onChange={e => handleCustomChange(id, e.target.value)}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-400">€</span>
              </div>
            )
          })}
          <div className={cn('text-xs font-medium text-right mt-1', customValid ? 'text-green-600' : 'text-red-500')}>
            Total : {customTotal.toFixed(2)} € / {amountNum.toFixed(2)} €
            {!customValid && ' — doit être égal au montant'}
          </div>
        </div>
      )}

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
