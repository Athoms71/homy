import { createClient } from '@/lib/supabase/client'
import type { ShoppingCategory } from '@homy/shared-types'

// ─── Listes ───────────────────────────────────────────────────────────────────

export async function getShoppingLists(householdId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', householdId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createShoppingList(householdId: string, name: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ household_id: householdId, name, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveShoppingList(listId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shopping_lists')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', listId)

  if (error) throw error
}

export async function deleteShoppingList(listId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', listId)

  if (error) throw error
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export async function getShoppingItems(listId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addShoppingItem(
  listId: string,
  item: {
    name: string
    quantity: number
    unit?: string
    category: ShoppingCategory
    is_urgent?: boolean
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shopping_items')
    .insert({ list_id: listId, ...item })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleShoppingItem(itemId: string, checked: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('shopping_items')
    .update({
      checked_by: checked ? user?.id : null,
      checked_at: checked ? new Date().toISOString() : null,
    })
    .eq('id', itemId)

  if (error) throw error
}

export async function updateShoppingItem(
  itemId: string,
  updates: { name?: string; quantity?: number; unit?: string; category?: ShoppingCategory; is_urgent?: boolean }
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shopping_items')
    .update(updates)
    .eq('id', itemId)

  if (error) throw error
}

export async function deleteShoppingItem(itemId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

export async function clearCheckedItems(listId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('list_id', listId)
    .not('checked_by', 'is', null)

  if (error) throw error
}
