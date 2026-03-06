'use client'

import { useToggleShoppingItem, useDeleteShoppingItem } from '@/hooks/useShopping'
import { getCategoryInfo } from '@/lib/categories'
import { Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  item: {
    id: string
    name: string
    quantity: number
    unit?: string
    category: string
    is_urgent: boolean
    checked_by?: string | null
    checked_at?: string | null
  }
  listId: string
}

export function ShoppingItemRow({ item, listId }: Props) {
  const toggle = useToggleShoppingItem(listId)
  const remove = useDeleteShoppingItem(listId)
  const cat = getCategoryInfo(item.category as any)
  const isChecked = !!item.checked_by

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition group',
        isChecked ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggle.mutate({ itemId: item.id, checked: !isChecked })}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition',
          isChecked
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-primary-400'
        )}
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Emoji catégorie */}
      <span className="text-lg flex-shrink-0">{cat.emoji}</span>

      {/* Nom + quantité */}
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm font-medium', isChecked ? 'line-through text-gray-400' : 'text-gray-800')}>
          {item.name}
        </span>
        {(item.quantity !== 1 || item.unit) && (
          <span className="text-gray-400 text-xs ml-2">
            {item.quantity}{item.unit ? ` ${item.unit}` : ''}
          </span>
        )}
      </div>

      {/* Urgent */}
      {item.is_urgent && !isChecked && (
        <AlertTriangle size={15} className="text-orange-400 flex-shrink-0" />
      )}

      {/* Supprimer */}
      <button
        onClick={() => remove.mutate(item.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition flex-shrink-0"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
