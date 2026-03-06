import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBills,
  createBill,
  markBillAsPaid,
  deleteBill,
  updateBill,
} from '@/services/bills.service'
import type { BillCategory, BillFrequency } from '@homy/shared-types'

export function useBills(householdId: string | null) {
  return useQuery({
    queryKey: ['bills', householdId],
    queryFn: () => getBills(householdId!),
    enabled: !!householdId,
  })
}

export function useCreateBill(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bill: {
      provider: string
      amount: number
      category: BillCategory
      frequency: BillFrequency
      due_date: string
      auto_renew: boolean
      notes?: string
    }) => createBill(householdId, bill),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills', householdId] }),
  })
}

export function useMarkBillAsPaid(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ billId, autoRenew, frequency, dueDate }: {
      billId: string
      autoRenew: boolean
      frequency: BillFrequency
      dueDate: string
    }) => markBillAsPaid(billId, autoRenew, frequency, dueDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills', householdId] }),
  })
}

export function useDeleteBill(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (billId: string) => deleteBill(billId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills', householdId] }),
  })
}

export function useUpdateBill(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ billId, updates }: { billId: string; updates: Parameters<typeof updateBill>[1] }) =>
      updateBill(billId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills', householdId] }),
  })
}
