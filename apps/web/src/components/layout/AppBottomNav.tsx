"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, DollarSign, FileText, LayoutDashboard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
	{ href: "/shopping", label: "Courses", icon: ShoppingCart },
	{ href: "/calendar", label: "Calendrier", icon: Calendar },
	{ href: "/expenses", label: "Soldes", icon: DollarSign },
	{ href: "/bills", label: "Factures", icon: FileText },
];

export function AppBottomNav() {
	const pathname = usePathname();
	return (
		<nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex safe-bottom z-50">
			{NAV_ITEMS.map(({ href, label, icon: Icon }) => (
				<Link key={href} href={href} className={cn("flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs transition", pathname === href ? "text-primary-600" : "text-gray-400")}>
					<Icon size={20} />
					<span>{label}</span>
				</Link>
			))}
		</nav>
	);
}
