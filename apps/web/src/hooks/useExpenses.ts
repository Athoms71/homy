import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExpenseGroups,
  createExpenseGroup,
  deleteExpenseGroup,
  getExpenses,
  addExpense,
  deleteExpense,
  markSplitAsPaid,
  computeBalances,
} from '@/services/expenses.service'
import type { ExpenseCategory } from '@homy/shared-types'
import { useMemo } from 'react'

// ─── Groupes ──────────────────────────────────────────────────────────────────

export function useExpenseGroups(householdId: string | null) {
  return useQuery({
    queryKey: ['expense-groups', householdId],
    queryFn: () => getExpenseGroups(householdId!),
    enabled: !!householdId,
  })
}

export function useCreateExpenseGroup(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createExpenseGroup(householdId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-groups', householdId] }),
  })
}

export function useDeleteExpenseGroup(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => deleteExpenseGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-groups', householdId] }),
  })
}

// ─── Dépenses ─────────────────────────────────────────────────────────────────

export function useExpenses(groupId: string | null) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => getExpenses(groupId!),
    enabled: !!groupId,
  })
}

export function useAddExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      description: string
      amount: number
      paidBy: string
      category: ExpenseCategory
      date: string
      splitUserIds: string[]
      splitMode: 'equal' | 'custom'
      customAmounts?: Record<string, number>
    }) => addExpense({ groupId, ...params }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', groupId] }),
  })
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', groupId] }),
  })
}

export function useMarkSplitAsPaid(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (splitId: string) => markSplitAsPaid(splitId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', groupId] }),
  })
}

// ─── Balances calculées ───────────────────────────────────────────────────────

export function useBalances(groupId: string | null, memberIds: string[]) {
  const { data: expenses = [] } = useExpenses(groupId)

  return useMemo(() => {
    if (!expenses.length || !memberIds.length) return []
    return computeBalances(expenses, memberIds)
  }, [expenses, memberIds])
}
