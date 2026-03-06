import { createClient } from '@/lib/supabase/client'

// ─── Créer un foyer ───────────────────────────────────────────────────────────

export async function createHousehold(name: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, created_by: user.id })
    .select()
    .single()

  if (householdError) throw householdError

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'admin' })

  if (memberError) throw memberError

  return household
}

// ─── Rejoindre un foyer via code ──────────────────────────────────────────────

export async function joinHousehold(inviteCode: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: household, error: findError } = await supabase
    .from('households')
    .select()
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .single()

  if (findError || !household) throw new Error("Code d'invitation invalide")

  // Vérifier que l'utilisateur n'est pas déjà membre
  const { data: existing } = await supabase
    .from('household_members')
    .select()
    .eq('household_id', household.id)
    .eq('user_id', user.id)
    .single()

  if (existing) throw new Error('Tu es déjà membre de ce foyer')

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'member' })

  if (memberError) throw memberError

  return household
}

// ─── Récupérer les foyers de l'utilisateur ────────────────────────────────────

export async function getMyHouseholds() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('household_members')
    .select(`
      role,
      joined_at,
      households (
        id, name, invite_code, created_by, created_at
      )
    `)
    .eq('user_id', user.id)

  if (error) throw error
  return data
}

// ─── Récupérer les membres d'un foyer ────────────────────────────────────────

export async function getHouseholdMembers(householdId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('household_members')
    .select(`
      role,
      joined_at,
      profiles (
        id, name, avatar_url
      )
    `)
    .eq('household_id', householdId)

  if (error) throw error
  return data
}

// ─── Régénérer le code d'invitation ──────────────────────────────────────────

export async function regenerateInviteCode(householdId: string) {
  const supabase = createClient()

  // Générer un nouveau code aléatoire 8 caractères
  const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data, error } = await supabase
    .from('households')
    .update({ invite_code: newCode })
    .eq('id', householdId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Quitter un foyer ────────────────────────────────────────────────────────

export async function leaveHousehold(householdId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', user.id)

  if (error) throw error
}
