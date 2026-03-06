import type { ShoppingCategory } from '@homy/shared-types'

export const CATEGORIES: {
  value: ShoppingCategory
  label: string
  emoji: string
  color: string
}[] = [
  { value: 'fruits_vegetables', label: 'Fruits & Légumes', emoji: '🥦', color: 'bg-green-100 text-green-700' },
  { value: 'meat_fish',         label: 'Viandes & Poissons', emoji: '🥩', color: 'bg-red-100 text-red-700' },
  { value: 'dairy',             label: 'Produits laitiers', emoji: '🧀', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'bakery',            label: 'Boulangerie', emoji: '🥖', color: 'bg-orange-100 text-orange-700' },
  { value: 'frozen',            label: 'Surgelés', emoji: '🧊', color: 'bg-blue-100 text-blue-700' },
  { value: 'drinks',            label: 'Boissons', emoji: '🥤', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'hygiene',           label: 'Hygiène', emoji: '🧴', color: 'bg-purple-100 text-purple-700' },
  { value: 'cleaning',          label: 'Entretien', emoji: '🧹', color: 'bg-teal-100 text-teal-700' },
  { value: 'other',             label: 'Autre', emoji: '🛒', color: 'bg-gray-100 text-gray-700' },
]

export function getCategoryInfo(value: ShoppingCategory) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]
}
