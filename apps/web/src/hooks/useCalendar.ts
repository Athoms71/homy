import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getCalendarEvents,
  getUpcomingEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/services/calendar.service'
import type { CreateCalendarEventPayload, UpdateCalendarEventPayload } from '@homy/shared-types'

// ─── Événements d'une période (vue mois / semaine) ────────────────────────────

export function useCalendarEvents(
  householdId: string | null,
  from: string,
  to: string,
) {
  const qc = useQueryClient()

  // Realtime — sync entre membres du foyer
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`calendar_events:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['calendar-events', householdId] })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId, qc])

  return useQuery({
    queryKey: ['calendar-events', householdId, from, to],
    queryFn: () => getCalendarEvents(householdId!, from, to),
    enabled: !!householdId && !!from && !!to,
  })
}

// ─── Prochains événements (widget dashboard) ──────────────────────────────────

export function useUpcomingEvents(householdId: string | null, limit = 5) {
  return useQuery({
    queryKey: ['upcoming-events', householdId, limit],
    queryFn: () => getUpcomingEvents(householdId!, limit),
    enabled: !!householdId,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCalendarEvent(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) => createCalendarEvent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events', householdId] }),
  })
}

export function useUpdateCalendarEvent(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCalendarEventPayload) => updateCalendarEvent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events', householdId] }),
  })
}

export function useDeleteCalendarEvent(householdId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events', householdId] }),
  })
}
