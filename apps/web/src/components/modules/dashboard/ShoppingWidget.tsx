'use client'

import Link from 'next/link'
import { useShoppingLists, useShoppingItems } from '@/hooks/useShopping'
import { ShoppingCart, ArrowRight } from 'lucide-react'

interface Props {
  householdId: string
}

function ActiveListPreview({ listId, listName }: { listId: string; listName: string }) {
  const { data: items = [] } = useShoppingItems(listId)
  const unchecked = items.filter(i => !i.checked_by)
  const checked = items.filter(i => i.checked_by)
  const total = items.length
  const progress = total > 0 ? Math.round((checked.length / total) * 100) : 0

  return (
    <div className="bg-blue-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-800 truncate">{listName}</span>
        <span className="text-xs text-blue-500 flex-shrink-0 ml-2">
          {checked.length}/{total}
        </span>
      </div>
      {/* Barre de progression */}
      <div className="w-full bg-blue-200 rounded-full h-1.5 mb-2">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Aperçu des articles */}
      {unchecked.slice(0, 3).map(item => (
        <div key={item.id} className="text-xs text-blue-600 truncate">
          · {item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}
          {item.is_urgent && ' ⚡'}
        </div>
      ))}
      {unchecked.length > 3 && (
        <div className="text-xs text-blue-400 mt-0.5">+{unchecked.length - 3} autres articles</div>
      )}
      {unchecked.length === 0 && total > 0 && (
        <div className="text-xs text-green-600 font-medium">✓ Tout est coché !</div>
      )}
    </div>
  )
}

export function ShoppingWidget({ householdId }: Props) {
  const { data: lists = [], isLoading } = useShoppingLists(householdId)
  const activeLists = lists.slice(0, 2) // Afficher max 2 listes

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <h2 className="font-bold text-gray-800">Courses</h2>
        </div>
        <Link href="/shopping" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
          Voir tout <ArrowRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ) : activeLists.length === 0 ? (
        <div className="text-center py-4">
          <ShoppingCart size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">Aucune liste active</p>
          <Link href="/shopping" className="text-primary-600 text-xs hover:underline">
            Créer une liste →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {activeLists.map((list: any) => (
            <ActiveListPreview key={list.id} listId={list.id} listName={list.name} />
          ))}
          {lists.length > 2 && (
            <p className="text-xs text-gray-400 text-center">
              +{lists.length - 2} autre{lists.length - 2 > 1 ? 's' : ''} liste{lists.length - 2 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
