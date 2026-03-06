import type { ExpenseCategory } from '@homy/shared-types'

export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory
  label: string
  emoji: string
  color: string
}[] = [
  { value: 'food',       label: 'Alimentation', emoji: '🍔', color: 'bg-green-100 text-green-700' },
  { value: 'transport',  label: 'Transport',     emoji: '🚗', color: 'bg-blue-100 text-blue-700' },
  { value: 'housing',    label: 'Logement',      emoji: '🏠', color: 'bg-orange-100 text-orange-700' },
  { value: 'leisure',    label: 'Loisirs',       emoji: '🎉', color: 'bg-purple-100 text-purple-700' },
  { value: 'health',     label: 'Santé',         emoji: '💊', color: 'bg-red-100 text-red-700' },
  { value: 'utilities',  label: 'Factures',      emoji: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'other',      label: 'Autre',         emoji: '💰', color: 'bg-gray-100 text-gray-700' },
]

export function getExpenseCategoryInfo(value: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find(c => c.value === value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}
