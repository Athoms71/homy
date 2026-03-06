import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMyHouseholds,
  getHouseholdMembers,
  createHousehold,
  joinHousehold,
  regenerateInviteCode,
  leaveHousehold,
} from '@/services/household.service'

export function useMyHouseholds() {
  return useQuery({
    queryKey: ['households'],
    queryFn: getMyHouseholds,
  })
}

export function useHouseholdMembers(householdId: string | null) {
  return useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => getHouseholdMembers(householdId!),
    enabled: !!householdId,
  })
}

export function useCreateHousehold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createHousehold(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['households'] }),
  })
}

export function useJoinHousehold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => joinHousehold(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['households'] }),
  })
}

export function useRegenerateInviteCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (householdId: string) => regenerateInviteCode(householdId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['households'] }),
  })
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (householdId: string) => leaveHousehold(householdId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['households'] }),
  })
}
