'use client'

import { useState } from 'react'
import { useAddShoppingItem } from '@/hooks/useShopping'
import { CATEGORIES } from '@/lib/categories'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShoppingCategory } from '@homy/shared-types'

interface Props {
  listId: string
  onClose: () => void
}

export function AddItemForm({ listId, onClose }: Props) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState<ShoppingCategory>('other')
  const [isUrgent, setIsUrgent] = useState(false)

  const { mutate, isPending } = useAddShoppingItem(listId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    mutate(
      { name: name.trim(), quantity: parseFloat(quantity) || 1, unit: unit || undefined, category, is_urgent: isUrgent },
      {
        onSuccess: () => {
          setName('')
          setQuantity('1')
          setUnit('')
          setCategory('other')
          setIsUrgent(false)
          onClose()
        }
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Article</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Lait, tomates, pain..."
          autoFocus
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Quantité + unité */}
      <div className="flex gap-3">
        <div className="w-24">
          <label className="block text-sm font-medium text-gray-700 mb-1">Qté</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
          <input
            type="text"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="kg, L, sachet..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
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

      {/* Urgent */}
      <button
        type="button"
        onClick={() => setIsUrgent(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition',
          isUrgent
            ? 'border-orange-400 bg-orange-50 text-orange-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        )}
      >
        <AlertTriangle size={16} />
        {isUrgent ? '⚡ Urgent activé' : 'Marquer comme urgent'}
      </button>

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        {isPending ? 'Ajout...' : 'Ajouter'}
      </button>
    </form>
  )
}
