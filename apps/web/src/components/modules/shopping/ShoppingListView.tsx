'use client'

import { useState } from 'react'
import { useShoppingItems, useClearCheckedItems, useArchiveShoppingList } from '@/hooks/useShopping'
import { ShoppingItemRow } from './ShoppingItemRow'
import { AddItemForm } from './AddItemForm'
import { getCategoryInfo, CATEGORIES } from '@/lib/categories'
import { Plus, Trash2, Archive, Loader2, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  list: { id: string; name: string }
  householdId: string
  onBack: () => void
}

export function ShoppingListView({ list, householdId, onBack }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const { data: items = [], isLoading } = useShoppingItems(list.id)
  const clearChecked = useClearCheckedItems(list.id)
  const archive = useArchiveShoppingList(householdId)

  const unchecked = items.filter(i => !i.checked_by)
  const checked = items.filter(i => i.checked_by)

  const filteredUnchecked = filter === 'all'
    ? unchecked
    : unchecked.filter(i => i.category === filter)

  // Grouper par catégorie
  const grouped = CATEGORIES
    .map(cat => ({
      cat,
      items: filteredUnchecked.filter(i => i.category === cat.value),
    }))
    .filter(g => g.items.length > 0)

  function handleArchive() {
    if (!confirm(`Archiver la liste "${list.name}" ?`)) return
    archive.mutate(list.id, { onSuccess: onBack })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition text-sm">
          ← Retour
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-lg">{list.name}</h2>
          <p className="text-gray-400 text-xs flex items-center gap-1">
            <Wifi size={11} className="text-green-500" />
            Synchronisé en temps réel
          </p>
        </div>
        <div className="flex gap-2">
          {checked.length > 0 && (
            <button
              onClick={() => clearChecked.mutate()}
              className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1"
            >
              <Trash2 size={13} />
              Vider cochés
            </button>
          )}
          <button
            onClick={handleArchive}
            className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"
          >
            <Archive size={13} />
            Archiver
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
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Articles non cochés groupés */}
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

          {/* Articles cochés */}
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
      <div className="pt-4">
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
    </div>
  )
}
