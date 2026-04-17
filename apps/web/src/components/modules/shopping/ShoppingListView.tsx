'use client'

import { useState } from 'react'
import { useShoppingItems, useClearCheckedItems, useDeleteShoppingList } from '@/hooks/useShopping'
import { ShoppingItemRow } from './ShoppingItemRow'
import { AddItemForm } from './AddItemForm'
import { CATEGORIES } from '@/lib/categories'
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  list: { id: string; name: string }
  householdId: string
  onBack: () => void
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-safe">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-xl">
        <p className="text-gray-800 font-medium text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShoppingListView({ list, householdId, onBack }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: items = [], isLoading } = useShoppingItems(list.id)
  const clearChecked = useClearCheckedItems(list.id)
  const deleteList = useDeleteShoppingList(householdId)

  const unchecked = items.filter(i => !i.checked_by)
  const checked = items.filter(i => i.checked_by)

  const filteredUnchecked = filter === 'all'
    ? unchecked
    : unchecked.filter(i => i.category === filter)

  const grouped = CATEGORIES
    .map(cat => ({ cat, items: filteredUnchecked.filter(i => i.category === cat.value) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-lg">{list.name}</h2>
        </div>
        <div className="flex gap-2 items-center">
          {checked.length > 0 && (
            <button
              onClick={() => clearChecked.mutate()}
              className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={13} />
              Vider cochés
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition',
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Tout ({unchecked.length})
        </button>
        {CATEGORIES.filter(cat => unchecked.some(i => i.category === cat.value)).map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition',
              filter === cat.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {cat.emoji} {unchecked.filter(i => i.category === cat.value).length}
          </button>
        ))}
      </div>

      {/* Articles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={24} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {grouped.length === 0 && unchecked.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-sm">Liste vide — ajoute un article !</p>
            </div>
          ) : (
            grouped.map(({ cat, items: catItems }) => (
              <div key={cat.value}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
                  <span className="text-xs text-gray-400">({catItems.length})</span>
                </div>
                <div className="space-y-1">
                  {catItems.map(item => (
                    <ShoppingItemRow key={item.id} item={item} listId={list.id} />
                  ))}
                </div>
              </div>
            ))
          )}

          {checked.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  ✓ Dans le panier ({checked.length})
                </span>
              </div>
              <div className="space-y-1">
                {checked.map(item => (
                  <ShoppingItemRow key={item.id} item={item} listId={list.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bouton ajouter */}
      <div className="pt-2">
        {showAddForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Ajouter un article</h3>
            <AddItemForm listId={list.id} onClose={() => setShowAddForm(false)} />
            <button
              onClick={() => setShowAddForm(false)}
              className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-200"
          >
            <Plus size={20} />
            Ajouter un article
          </button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`Supprimer la liste "${list.name}" ?`}
          onConfirm={() => deleteList.mutate(list.id, { onSuccess: onBack })}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
