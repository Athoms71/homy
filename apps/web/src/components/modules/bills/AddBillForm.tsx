'use client'

import { useState } from 'react'
import { useCreateBill } from '@/hooks/useBills'
import { BILL_CATEGORIES, BILL_FREQUENCIES } from '@/lib/billConfig'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BillCategory, BillFrequency } from '@homy/shared-types'

interface Props {
  householdId: string
  onClose: () => void
}

export function AddBillForm({ householdId, onClose }: Props) {
  const [provider, setProvider] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<BillCategory>('other')
  const [frequency, setFrequency] = useState<BillFrequency>('monthly')
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [autoRenew, setAutoRenew] = useState(true)
  const [notes, setNotes] = useState('')

  const { mutate, isPending } = useCreateBill(householdId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!provider.trim() || !amount) return
    mutate(
      {
        provider: provider.trim(),
        amount: parseFloat(amount),
        category,
        frequency,
        due_date: dueDate,
        auto_renew: autoRenew,
        notes: notes.trim() || undefined,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Fournisseur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
        <input
          type="text"
          value={provider}
          onChange={e => setProvider(e.target.value)}
          placeholder="EDF, Orange, Netflix, Assurance..."
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine échéance</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Fréquence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence</label>
        <div className="flex flex-wrap gap-2">
          {BILL_FREQUENCIES.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition border-2',
                frequency === f.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
        <div className="grid grid-cols-4 gap-2">
          {BILL_CATEGORIES.map(cat => (
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

      {/* Renouvellement auto */}
      {frequency !== 'one_time' && (
        <button
          type="button"
          onClick={() => setAutoRenew(v => !v)}
          className={cn(
            'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition',
            autoRenew
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          )}
        >
          <span>{autoRenew ? '🔄' : '⏹️'}</span>
          {autoRenew ? 'Renouvellement automatique activé' : 'Pas de renouvellement auto'}
        </button>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Contrat n°, référence..."
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !provider.trim() || !amount}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        {isPending ? 'Ajout...' : 'Ajouter la facture'}
      </button>
    </form>
  )
}
