'use client'

import Link from 'next/link'
import { useBills } from '@/hooks/useBills'
import { getBillStatus, getDaysUntilDue, getMonthlyEstimate } from '@/services/bills.service'
import { getBillCategoryInfo } from '@/lib/billConfig'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Props {
  householdId: string
}

export function BillsWidget({ householdId }: Props) {
  const { data: bills = [], isLoading } = useBills(householdId)

  const unpaidBills = bills.filter(b => getBillStatus(b as any) !== 'paid')
  const monthlyEstimate = getMonthlyEstimate(bills as any)

  // Trier : en retard → urgent → à venir
  const ORDER = { overdue: 0, urgent: 1, upcoming: 2, paid: 3 }
  const sortedUnpaid = [...unpaidBills]
    .sort((a, b) => {
      const sa = ORDER[getBillStatus(a as any)]
      const sb = ORDER[getBillStatus(b as any)]
      if (sa !== sb) return sa - sb
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    .slice(0, 3)

  const statusColors = {
    overdue:  'bg-red-50 border border-red-200',
    urgent:   'bg-orange-50 border border-orange-200',
    upcoming: 'bg-gray-50 border border-gray-100',
    paid:     'bg-green-50 border border-green-100',
  }

  const textColors = {
    overdue:  'text-red-600',
    urgent:   'text-orange-600',
    upcoming: 'text-gray-500',
    paid:     'text-green-600',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📄</span>
          <h2 className="font-bold text-gray-800">Factures</h2>
        </div>
        <Link href="/bills" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
          Voir tout <ArrowRight size={12} />
        </Link>
      </div>

      {/* Estimation mensuelle */}
      {bills.length > 0 && (
        <div className="bg-primary-50 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
          <span className="text-xs text-primary-600 font-medium">Estimation mensuelle</span>
          <span className="text-primary-700 font-bold text-sm">{monthlyEstimate.toFixed(0)} €/mois</span>
        </div>
      )}

      {isLoading ? (
        <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ) : unpaidBills.length === 0 && bills.length > 0 ? (
        <div className="text-center py-3">
          <CheckCircle size={24} className="mx-auto text-green-500 mb-1" />
          <p className="text-green-600 text-sm font-medium">Tout est à jour !</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">Aucune facture</p>
          <Link href="/bills" className="text-primary-600 text-xs hover:underline">
            Ajouter une facture →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedUnpaid.map((bill: any) => {
            const status = getBillStatus(bill)
            const cat = getBillCategoryInfo(bill.category)
            const days = getDaysUntilDue(bill.due_date)
            return (
              <div key={bill.id} className={cn('rounded-xl p-3 flex items-center gap-3', statusColors[status])}>
                <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{bill.provider}</p>
                  <p className={cn('text-xs', textColors[status])}>
                    {days < 0
                      ? `${Math.abs(days)} j de retard`
                      : days === 0
                        ? "Aujourd'hui !"
                        : `Dans ${days} j — ${format(new Date(bill.due_date), 'd MMM', { locale: fr })}`
                    }
                  </p>
                </div>
                <span className="font-bold text-gray-800 text-sm flex-shrink-0">
                  {bill.amount.toFixed(0)} €
                </span>
              </div>
            )
          })}
          {unpaidBills.length > 3 && (
            <p className="text-xs text-gray-400 text-center">
              +{unpaidBills.length - 3} autre{unpaidBills.length - 3 > 1 ? 's' : ''} facture{unpaidBills.length - 3 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
