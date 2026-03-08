import { createClient } from '@/lib/supabase/client'
import type { CreateCalendarEventPayload, UpdateCalendarEventPayload } from '@homy/shared-types'

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getCalendarEvents(householdId: string, from: string, to: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      profiles:created_by ( id, name )
    `)
    .eq('household_id', householdId)
    .gte('starts_at', from)
    .lte('starts_at', to)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getUpcomingEvents(householdId: string, limit = 5) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`*, profiles:created_by ( id, name )`)
    .eq('household_id', householdId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data
}

// ─── Création ─────────────────────────────────────────────────────────────────

export async function createCalendarEvent(payload: CreateCalendarEventPayload) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...payload, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Mise à jour ──────────────────────────────────────────────────────────────

export async function updateCalendarEvent({ id, ...updates }: UpdateCalendarEventPayload) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Vérifier que l'user est le créateur ou admin (RLS le gère aussi côté DB)
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function deleteCalendarEvent(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)

  if (error) throw error
}
