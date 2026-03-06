'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMyHouseholds, useHouseholdMembers } from '@/hooks/useHousehold'
import { ShoppingWidget } from '@/components/modules/dashboard/ShoppingWidget'
import { ExpensesWidget } from '@/components/modules/dashboard/ExpensesWidget'
import { BillsWidget } from '@/components/modules/dashboard/BillsWidget'
import { HouseholdWidget } from '@/components/modules/dashboard/HouseholdWidget'
import { useBills } from '@/hooks/useBills'
import { useShoppingLists } from '@/hooks/useShopping'
import { useExpenseGroups, useExpenses, useBalances } from '@/hooks/useExpenses'
import { getBillStatus, getMonthlyEstimate } from '@/services/bills.service'
import { Loader2, Bell, ShoppingCart, DollarSign, FileText, Users, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({ emoji, label, value, sub, color, href }: {
  emoji: string
  label: string
  value: string
  sub?: string
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  href: string
}) {
  const colors = {
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red:    'bg-red-50    border-red-200    text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <Link href={href} className={cn('rounded-2xl border-2 p-4 flex flex-col gap-1 hover:shadow-md transition group', colors[color])}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs font-medium opacity-60 group-hover:opacity-100 transition">→</span>
      </div>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </Link>
  )
}

// ─── KPI row qui calcule les stats ────────────────────────────────────────────

function KpiRow({ householdId, currentUserId, memberIds }: {
  householdId: string
  currentUserId: string
  memberIds: string[]
}) {
  const { data: lists = [] } = useShoppingLists(householdId)
  const { data: groups = [] } = useExpenseGroups(householdId)
  const { data: bills = [] } = useBills(householdId)

  // Balance totale que je dois
  const firstGroup = groups[0] as any
  const balances = useBalances(firstGroup?.id ?? null, memberIds)
  const iOweTotal = balances
    .filter(b => b.fromUserId === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0)

  // Stats factures
  const overdue = bills.filter(b => getBillStatus(b as any) === 'overdue').length
  const urgent  = bills.filter(b => getBillStatus(b as any) === 'urgent').length
  const monthly = getMonthlyEstimate(bills as any)

  // Articles restants dans toutes les listes
  const activeLists = lists.length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <KpiCard
        emoji="🛒"
        label="Listes actives"
        value={String(activeLists)}
        sub={activeLists === 0 ? 'Aucune liste' : `${activeLists} liste${activeLists > 1 ? 's' : ''} en cours`}
        color="blue"
        href="/shopping"
      />
      <KpiCard
        emoji="💸"
        label="Je dois"
        value={iOweTotal > 0 ? `${iOweTotal.toFixed(0)} €` : '0 €'}
        sub={iOweTotal > 0 ? 'Solde à régler' : 'Tout est à jour !'}
        color={iOweTotal > 0 ? 'orange' : 'green'}
        href="/expenses"
      />
      <KpiCard
        emoji="⚡"
        label="Factures urgentes"
        value={String(overdue + urgent)}
        sub={overdue > 0 ? `${overdue} en retard` : urgent > 0 ? `${urgent} dans 7 jours` : 'Rien d\'urgent'}
        color={overdue > 0 ? 'red' : urgent > 0 ? 'orange' : 'green'}
        href="/bills"
      />
      <KpiCard
        emoji="📊"
        label="Budget mensuel"
        value={`${monthly.toFixed(0)} €`}
        sub="Factures récurrentes"
        color="purple"
        href="/bills"
      />
    </div>
  )
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({ householdId }: { householdId: string }) {
  const { data: bills = [] } = useBills(householdId)
  const critical = bills.filter(b => {
    const s = getBillStatus(b as any)
    return s === 'overdue' || s === 'urgent'
  })
  if (critical.length === 0) return null
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-5">
      <Bell size={18} className="text-orange-500 flex-shrink-0 animate-pulse" />
      <p className="text-orange-700 text-sm">
        <span className="font-semibold">{critical.length} facture{critical.length > 1 ? 's' : ''}</span>
        {' '}nécessite{critical.length === 1 ? '' : 'nt'} ton attention —{' '}
        <Link href="/bills" className="underline font-medium">voir les factures</Link>
      </p>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('Bonjour')

  const { data: householdsData, isLoading } = useMyHouseholds()
  const { data: membersData = [] } = useHouseholdMembers(householdId)
  const memberIds = membersData.map((m: any) => m.profiles.id)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bonjour')
    else if (hour < 18) setGreeting('Bon après-midi')
    else setGreeting('Bonsoir')

    createClient().auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      setCurrentUserId(user.id)
      setUserName(user.user_metadata?.name ?? user.email?.split('@')[0] ?? '')
    })
  }, [])

  useEffect(() => {
    if (householdsData && householdsData.length > 0 && !householdId) {
      setHouseholdId((householdsData[0] as any).households.id)
    }
  }, [householdsData, householdId])

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}{userName ? `, ${userName}` : ''} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {householdId && currentUserId ? (
        <>
          {/* Alerte */}
          <AlertBanner householdId={householdId} />

          {/* KPIs */}
          <KpiRow
            householdId={householdId}
            currentUserId={currentUserId}
            memberIds={memberIds}
          />

          {/* Widgets détaillés
              Desktop : 3 colonnes
                Col 1 (large) : Courses
                Col 2 (large) : Factures
                Col 3 (étroite) : Soldes + Foyer empilés
              Mobile : 1 colonne
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Col 1 */}
            <div className="md:col-span-1">
              <ShoppingWidget householdId={householdId} />
            </div>

            {/* Col 2 */}
            <div className="md:col-span-1">
              <BillsWidget householdId={householdId} />
            </div>

            {/* Col 3 — Soldes + Foyer empilés */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <ExpensesWidget
                householdId={householdId}
                currentUserId={currentUserId}
                memberIds={memberIds}
              />
              <HouseholdWidget />
            </div>
          </div>
        </>
      ) : (
        /* Pas de foyer */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HouseholdWidget />
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <p className="text-5xl mb-4">🏠</p>
            <p className="font-bold text-primary-800 text-lg mb-1">Crée ton premier foyer</p>
            <p className="text-primary-600 text-sm mb-4">Rejoins ou crée un foyer pour accéder à toutes les fonctionnalités.</p>
            <Link href="/household" className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-700 transition">
              Commencer →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
