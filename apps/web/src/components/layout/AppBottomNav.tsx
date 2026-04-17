'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, DollarSign, FileText, LayoutDashboard, Calendar, Settings, Home, Users, ChevronUp, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const MAIN_NAV = [
  { href: '/shopping',  label: 'Courses',    icon: ShoppingCart },
  { href: '/calendar',  label: 'Calendrier', icon: Calendar },
  { href: '/dashboard', label: 'Accueil',    icon: LayoutDashboard },
  { href: '/expenses',  label: 'Soldes',     icon: DollarSign },
  { href: '/bills',     label: 'Factures',   icon: FileText },
]

const DRAWER_NAV = [
  { href: '/household', label: 'Mon foyer',    icon: Home },
  { href: '/settings',  label: 'Paramètres',   icon: Settings },
]

export function AppBottomNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      {drawerOpen && (
        <div className="md:hidden fixed bottom-16 inset-x-0 bg-white border-t border-gray-200 z-50 rounded-t-3xl shadow-xl px-4 py-6 pb-safe">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 text-center">Plus</p>
          <div className="space-y-1">
            {DRAWER_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href} href={href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition',
                  pathname === href ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50 flex pb-safe">
        {MAIN_NAV.map(({ href, label, icon: Icon }, i) => {
          const isCenter = i === 2
          const isActive = pathname === href

          if (isCenter) {
            // Bouton central = accueil OU flèche drawer si déjà sur accueil
            const onDashboard = pathname === '/dashboard'
            return (
              <div key={href} className="flex-1 flex flex-col items-center">
                {onDashboard ? (
                  // Flèche pour ouvrir drawer
                  <button
                    onClick={() => setDrawerOpen(v => !v)}
                    className="flex flex-col items-center justify-center py-2 gap-0.5 w-full"
                  >
                    <div className="w-12 h-12 -mt-5 rounded-full bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-300">
                      {drawerOpen
                        ? <ChevronDown size={22} className="text-white" />
                        : <ChevronUp size={22} className="text-white" />
                      }
                    </div>
                    <span className="text-xs text-primary-600 font-medium mt-0.5">Menu</span>
                  </button>
                ) : (
                  <Link href={href} className="flex flex-col items-center justify-center py-2 gap-0.5 w-full">
                    <div className={cn(
                      'w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg',
                      isActive ? 'bg-primary-600 shadow-primary-300' : 'bg-gray-700 shadow-gray-300'
                    )}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <span className={cn('text-xs font-medium mt-0.5', isActive ? 'text-primary-600' : 'text-gray-500')}>
                      {label}
                    </span>
                  </Link>
                )}
              </div>
            )
          }

          return (
            <Link
              key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs transition pt-3',
                isActive ? 'text-primary-600' : 'text-gray-400'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
