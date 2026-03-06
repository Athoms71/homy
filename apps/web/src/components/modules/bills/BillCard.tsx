'use client'

import { useMarkBillAsPaid, useDeleteBill } from '@/hooks/useBills'
import { getBillCategoryInfo, getBillFrequencyInfo } from '@/lib/billConfig'
import { getDaysUntilDue, getBillStatus } from '@/services/bills.service'
import { CheckCircle, Trash2, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Props {
  bill: {
    id: string
    provider: string
    amount: number
    category: string
    frequency: string
    due_date: string
    auto_renew: boolean
    paid_at?: string | null
    notes?: string | null
  }
  householdId: string
}

export function BillCard({ bill, householdId }: Props) {
  const markPaid = useMarkBillAsPaid(householdId)
  const remove = useDeleteBill(householdId)

  const cat = getBillCategoryInfo(bill.category as any)
  const freq = getBillFrequencyInfo(bill.frequency as any)
  const status = getBillStatus(bill)
  const daysUntil = getDaysUntilDue(bill.due_date)

  const statusConfig = {
    paid:     { label: 'Payée',      bg: 'bg-green-50  border-green-200',  badge: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
    overdue:  { label: 'En retard',  bg: 'bg-red-50    border-red-200',    badge: 'bg-red-100   text-red-700',    dot: 'bg-red-500' },
    urgent:   { label: 'Urgent',     bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
    upcoming: { label: 'À venir',    bg: 'bg-white     border-gray-200',   badge: 'bg-gray-100  text-gray-600',   dot: 'bg-gray-300' },
  }

  const sc = statusConfig[status]

  function handleMarkPaid() {
    markPaid.mutate({
      billId: bill.id,
      autoRenew: bill.auto_renew,
      frequency: bill.frequency as any,
      dueDate: bill.due_date,
    })
  }

  return (
    <div className={cn('rounded-2xl border-2 p-4 transition group', sc.bg)}>
      <div className="flex items-start gap-3">
        {/* Emoji + dot */}
        <div className="relative flex-shrink-0 mt-0.5">
          <span className="text-2xl">{cat.emoji}</span>
          <span className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', sc.dot)} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{bill.provider}</span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.badge)}>
              {sc.label}
            </span>
            {bill.auto_renew && status !== 'paid' && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <RotateCcw size={10} /> auto
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-bold text-gray-900">{bill.amount.toFixed(2)} €</span>
            <span className="text-gray-400 text-xs">{freq.shortLabel}</span>
            <span className="text-gray-400 text-xs">
              {status === 'paid'
                ? `Payée le ${format(new Date(bill.paid_at!), 'd MMM', { locale: fr })}`
                : daysUntil === 0
                  ? "Aujourd'hui"
                  : daysUntil < 0
                    ? `${Math.abs(daysUntil)} j de retard`
                    : `Dans ${daysUntil} j — ${format(new Date(bill.due_date), 'd MMM yyyy', { locale: fr })}`
              }
            </span>
          </div>

          {bill.notes && (
            <p className="text-gray-400 text-xs mt-1 truncate">{bill.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {status !== 'paid' && (
            <button
              onClick={handleMarkPaid}
              disabled={markPaid.isPending}
              className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <CheckCircle size={13} />
              Payée
            </button>
          )}
          <button
            onClick={() => { if (confirm('Supprimer cette facture ?')) remove.mutate(bill.id) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
