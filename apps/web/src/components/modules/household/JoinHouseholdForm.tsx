'use client'

import { useState } from 'react'
import { useJoinHousehold } from '@/hooks/useHousehold'
import { LogIn, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSuccess: () => void
}

export function JoinHouseholdForm({ onSuccess }: Props) {
  const [code, setCode] = useState('')
  const { mutate, isPending, error } = useJoinHousehold()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    mutate(code.trim(), { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Code d'invitation
        </label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="EX: A1B2C3D4"
          maxLength={8}
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="text-gray-400 text-xs mt-1">Code à 8 caractères partagé par un membre du foyer</p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
          {(error as Error).message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || code.length < 8}
        className={cn(
          'w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2.5 rounded-xl transition',
          'hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <LogIn size={18} />
        )}
        {isPending ? 'Vérification...' : 'Rejoindre le foyer'}
      </button>
    </form>
  )
}
