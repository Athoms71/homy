'use client'

import { useState, useEffect } from 'react'
import { useMyHouseholds } from '@/hooks/useHousehold'
import { useBills } from '@/hooks/useBills'
import { BillCard } from '@/components/modules/bills/BillCard'
import { AddBillForm } from '@/components/modules/bills/AddBillForm'
import { getMonthlyEstimate, getBillStatus } from '@/services/bills.service'
import { FileText, Plus, Loader2, Home, AlertTriangle, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type FilterTab = 'all' | 'upcoming' | 'paid'

export default function BillsPage() {
  const { data: householdsData, isLoading: loadingHouseholds } = useMyHouseholds()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('upcoming')

  useEffect(() => {
    if (householdsData && householdsData.length > 0 && !householdId) {
      setHouseholdId((householdsData[0] as any).households.id)
    }
  }, [householdsData, householdId])

  const { data: bills = [], isLoading: loadingBills } = useBills(householdId)

  const monthlyEstimate = getMonthlyEstimate(bills as any)
  const overdueCount = bills.filter(b => getBillStatus(b as any) === 'overdue').length
  const urgentCount = bills.filter(b => getBillStatus(b as any) === 'urgent').length

  const filteredBills = bills.filter(b => {
    const status = getBillStatus(b as any)
    if (filter === 'paid') return status === 'paid'
    if (filter === 'upcoming') return status !== 'paid'
    return true
  })

  const ORDER = { overdue: 0, urgent: 1, upcoming: 2, paid: 3 }
  const sortedBills = [...filteredBills].sort((a, b) => {
    const sa = ORDER[getBillStatus(a as any)]
    const sb = ORDER[getBillStatus(b as any)]
    if (sa !== sb) return sa - sb
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  if (loadingHouseholds) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>

  if (!householdsData || householdsData.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
        <Home size={40} className="mx-auto text-gray-300 mb-4" />
        <h2 className="font-semibold text-gray-600 mb-1">Aucun foyer</h2>
        <p className="text-gray-400 text-sm mb-4">Tu dois créer ou rejoindre un foyer.</p>
        <Link href="/household" className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">Gérer mes foyers</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📄 Factures</h1>
          <p className="text-gray-500 text-sm mt-1">Suivi des échéances et abonnements</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition">
          <Plus size={16} /><span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>

      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <TrendingDown size={18} className="mx-auto text-primary-500 mb-1" />
            <p className="font-bold text-gray-900">{monthlyEstimate.toFixed(0)} €</p>
            <p className="text-gray-400 text-xs">/ mois estimé</p>
          </div>
          <div className={cn('rounded-2xl border p-4 text-center', overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')}>
            <AlertTriangle size={18} className={cn('mx-auto mb-1', overdueCount > 0 ? 'text-red-500' : 'text-gray-300')} />
            <p className={cn('font-bold', overdueCount > 0 ? 'text-red-700' : 'text-gray-900')}>{overdueCount}</p>
            <p className="text-gray-400 text-xs">en retard</p>
          </div>
          <div className={cn('rounded-2xl border p-4 text-center', urgentCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200')}>
            <AlertTriangle size={18} className={cn('mx-auto mb-1', urgentCount > 0 ? 'text-orange-500' : 'text-gray-300')} />
            <p className={cn('font-bold', urgentCount > 0 ? 'text-orange-700' : 'text-gray-900')}>{urgentCount}</p>
            <p className="text-gray-400 text-xs">urgentes</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {([{ key: 'upcoming', label: 'À payer' }, { key: 'paid', label: 'Payées' }, { key: 'all', label: 'Tout' }] as { key: FilterTab; label: string }[]).map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition', filter === tab.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
            {tab.label}
          </button>
        ))}
      </div>

      {loadingBills ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary-600" size={24} /></div>
      ) : sortedBills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileText size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="font-semibold text-gray-600 mb-1">{bills.length === 0 ? 'Aucune facture' : 'Aucune facture ici'}</h2>
          {bills.length === 0 && (
            <>
              <p className="text-gray-400 text-sm mb-4">Ajoute tes factures récurrentes pour ne plus en manquer.</p>
              <button onClick={() => setShowAdd(true)} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">Ajouter une facture</button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBills.map((bill: any) => (
            <BillCard key={bill.id} bill={bill} householdId={householdId!} />
          ))}
        </div>
      )}

      {showAdd && householdId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">📄 Nouvelle facture</h2>
            <AddBillForm householdId={householdId} onClose={() => setShowAdd(false)} />
            <button onClick={() => setShowAdd(false)} className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
