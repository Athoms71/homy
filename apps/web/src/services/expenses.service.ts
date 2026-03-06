import { createClient } from '@/lib/supabase/client'
import type { ExpenseCategory } from '@homy/shared-types'

// ─── Groupes ──────────────────────────────────────────────────────────────────

export async function getExpenseGroups(householdId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expense_groups')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createExpenseGroup(householdId: string, name: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('expense_groups')
    .insert({ household_id: householdId, name, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteExpenseGroup(groupId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('expense_groups')
    .delete()
    .eq('id', groupId)

  if (error) throw error
}

// ─── Dépenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(groupId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_splits (*)
    `)
    .eq('group_id', groupId)
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export async function addExpense(params: {
  groupId: string
  description: string
  amount: number
  paidBy: string
  category: ExpenseCategory
  date: string
  splitUserIds: string[]
  splitMode: 'equal' | 'custom'
  customAmounts?: Record<string, number>
}) {
  const supabase = createClient()

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      group_id: params.groupId,
      description: params.description,
      amount: params.amount,
      paid_by: params.paidBy,
      category: params.category,
      date: params.date,
    })
    .select()
    .single()

  if (expenseError) throw expenseError

  // Calculer les splits
  let splits: { expense_id: string; user_id: string; amount: number; is_paid: boolean }[]

  if (params.splitMode === 'equal') {
    const perPerson = Math.round((params.amount / params.splitUserIds.length) * 100) / 100
    splits = params.splitUserIds.map(userId => ({
      expense_id: expense.id,
      user_id: userId,
      amount: perPerson,
      is_paid: userId === params.paidBy,
    }))
  } else {
    splits = params.splitUserIds.map(userId => ({
      expense_id: expense.id,
      user_id: userId,
      amount: params.customAmounts?.[userId] ?? 0,
      is_paid: userId === params.paidBy,
    }))
  }

  const { error: splitError } = await supabase
    .from('expense_splits')
    .insert(splits)

  if (splitError) throw splitError
  return expense
}

export async function deleteExpense(expenseId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) throw error
}

export async function markSplitAsPaid(splitId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('expense_splits')
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq('id', splitId)

  if (error) throw error
}

// ─── Calcul des balances ──────────────────────────────────────────────────────

export interface Balance {
  fromUserId: string
  toUserId: string
  amount: number
}

export function computeBalances(
  expenses: any[],
  memberIds: string[]
): Balance[] {
  // Calculer le solde net de chaque personne
  const net: Record<string, number> = {}
  memberIds.forEach(id => (net[id] = 0))

  for (const expense of expenses) {
    const splits = expense.expense_splits ?? []
    for (const split of splits) {
      if (!split.is_paid) {
        // Le payeur est créditeur
        net[expense.paid_by] = (net[expense.paid_by] ?? 0) + split.amount
        // Le débiteur doit de l'argent
        net[split.user_id] = (net[split.user_id] ?? 0) - split.amount
      }
    }
  }

  // Algorithme de simplification des dettes (greedy)
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.01)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.01)
    .map(([id, amount]) => ({ id, amount: -amount }))
    .sort((a, b) => b.amount - a.amount)

  const balances: Balance[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.amount, debtor.amount)

    if (amount > 0.01) {
      balances.push({
        fromUserId: debtor.id,
        toUserId: creditor.id,
        amount: Math.round(amount * 100) / 100,
      })
    }

    creditor.amount -= amount
    debtor.amount -= amount

    if (creditor.amount < 0.01) ci++
    if (debtor.amount < 0.01) di++
  }

  return balances
}
