import { createClient } from '@/lib/supabase/client'
import type { BillCategory, BillFrequency } from '@homy/shared-types'
import { addMonths, addQuarters, addYears } from 'date-fns'

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getBills(householdId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('household_id', householdId)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data
}

export async function createBill(householdId: string, bill: {
  provider: string
  amount: number
  category: BillCategory
  frequency: BillFrequency
  due_date: string
  auto_renew: boolean
  notes?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bills')
    .insert({ household_id: householdId, ...bill })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markBillAsPaid(billId: string, autoRenew: boolean, frequency: BillFrequency, currentDueDate: string) {
  const supabase = createClient()

  // Marquer comme payée
  const { error } = await supabase
    .from('bills')
    .update({ paid_at: new Date().toISOString() })
    .eq('id', billId)

  if (error) throw error

  // Si récurrente, créer la prochaine échéance
  if (autoRenew && frequency !== 'one_time') {
    const nextDate = computeNextDueDate(currentDueDate, frequency)
    const { data: original } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single()

    if (original) {
      await supabase.from('bills').insert({
        household_id: original.household_id,
        provider: original.provider,
        amount: original.amount,
        category: original.category,
        frequency: original.frequency,
        due_date: nextDate,
        auto_renew: original.auto_renew,
        notes: original.notes,
      })
    }
  }
}

export async function deleteBill(billId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', billId)

  if (error) throw error
}

export async function updateBill(billId: string, updates: Partial<{
  provider: string
  amount: number
  category: BillCategory
  frequency: BillFrequency
  due_date: string
  auto_renew: boolean
  notes: string
}>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId)

  if (error) throw error
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

export function computeNextDueDate(currentDueDate: string, frequency: BillFrequency): string {
  const date = new Date(currentDueDate)
  switch (frequency) {
    case 'monthly':   return addMonths(date, 1).toISOString().split('T')[0]
    case 'quarterly': return addQuarters(date, 1).toISOString().split('T')[0]
    case 'biannual':  return addMonths(date, 6).toISOString().split('T')[0]
    case 'annual':    return addYears(date, 1).toISOString().split('T')[0]
    default:          return currentDueDate
  }
}

export function getDaysUntilDue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getBillStatus(bill: { due_date: string; paid_at?: string | null }): 'paid' | 'overdue' | 'urgent' | 'upcoming' {
  if (bill.paid_at) return 'paid'
  const days = getDaysUntilDue(bill.due_date)
  if (days < 0)  return 'overdue'
  if (days <= 7) return 'urgent'
  return 'upcoming'
}

export function getMonthlyEstimate(bills: { amount: number; frequency: BillFrequency; paid_at?: string | null }[]): number {
  const unpaid = bills.filter(b => !b.paid_at)
  return unpaid.reduce((sum, bill) => {
    switch (bill.frequency) {
      case 'monthly':   return sum + bill.amount
      case 'quarterly': return sum + bill.amount / 3
      case 'biannual':  return sum + bill.amount / 6
      case 'annual':    return sum + bill.amount / 12
      default:          return sum
    }
  }, 0)
}
