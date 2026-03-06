'use client'

import { useState } from 'react'
import { useCreateHousehold } from '@/hooks/useHousehold'
import { Home, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSuccess: () => void
}

export function CreateHouseholdForm({ onSuccess }: Props) {
  const [name, setName] = useState('')
  const { mutate, isPending, error } = useCreateHousehold()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    mutate(name.trim(), { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du foyer
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Chez Alice & Bob, Coloc Voltaire..."
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
          {(error as Error).message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className={cn(
          'w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl transition',
          'hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Home size={18} />
        )}
        {isPending ? 'Création...' : 'Créer le foyer'}
      </button>
    </form>
  )
}
