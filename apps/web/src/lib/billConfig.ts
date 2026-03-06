import type { BillCategory, BillFrequency } from '@homy/shared-types'

export const BILL_CATEGORIES: {
  value: BillCategory
  label: string
  emoji: string
  color: string
}[] = [
  { value: 'rent',         label: 'Loyer',        emoji: '🏠', color: 'bg-blue-100 text-blue-700' },
  { value: 'energy',       label: 'Énergie',      emoji: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'internet',     label: 'Internet',     emoji: '📡', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'phone',        label: 'Téléphone',    emoji: '📱', color: 'bg-green-100 text-green-700' },
  { value: 'insurance',    label: 'Assurance',    emoji: '🛡️', color: 'bg-purple-100 text-purple-700' },
  { value: 'subscription', label: 'Abonnement',   emoji: '📺', color: 'bg-pink-100 text-pink-700' },
  { value: 'water',        label: 'Eau',          emoji: '💧', color: 'bg-teal-100 text-teal-700' },
  { value: 'other',        label: 'Autre',        emoji: '📄', color: 'bg-gray-100 text-gray-700' },
]

export const BILL_FREQUENCIES: {
  value: BillFrequency
  label: string
  shortLabel: string
}[] = [
  { value: 'monthly',   label: 'Mensuel',     shortLabel: '/mois' },
  { value: 'quarterly', label: 'Trimestriel', shortLabel: '/trim.' },
  { value: 'biannual',  label: 'Semestriel',  shortLabel: '/6 mois' },
  { value: 'annual',    label: 'Annuel',      shortLabel: '/an' },
  { value: 'one_time',  label: 'Unique',      shortLabel: 'unique' },
]

export function getBillCategoryInfo(value: BillCategory) {
  return BILL_CATEGORIES.find(c => c.value === value) ?? BILL_CATEGORIES[BILL_CATEGORIES.length - 1]
}

export function getBillFrequencyInfo(value: BillFrequency) {
  return BILL_FREQUENCIES.find(f => f.value === value) ?? BILL_FREQUENCIES[0]
}
