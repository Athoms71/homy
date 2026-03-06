'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, DollarSign, FileText, LayoutDashboard, Settings, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/household', label: 'Mon foyer',        icon: Home },
  { href: '/shopping',  label: 'Courses',          icon: ShoppingCart },
  { href: '/expenses',  label: 'Soldes',            icon: DollarSign },
  { href: '/bills',     label: 'Factures',          icon: FileText },
  { href: '/settings',  label: 'Paramètres',        icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 py-6 px-3">
      <div className="px-3 mb-8">
        <span className="text-xl font-bold text-primary-700">🏠 Homy</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
              pathname === href
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
