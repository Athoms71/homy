import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import Link from "next/link";
import { Settings } from "lucide-react";
import { HouseholdInitializer } from "@/components/layout/HouseholdInitializer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	return (
		<div className="flex h-screen bg-gray-50">
			<HouseholdInitializer />

			{/* Sidebar — desktop only */}
			<AppSidebar />

			{/* Main content */}
			<main className="flex-1 overflow-y-auto pb-20 md:pb-0">
				{/* Bouton settings mobile — haut droite */}
				<div className="md:hidden flex justify-end px-4 pt-4">
					<Link href="/settings" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700 transition shadow-sm">
						<Settings size={20} />
					</Link>
				</div>

				<div className="max-w-4xl mx-auto px-4 py-4 md:py-6">{children}</div>
			</main>

			{/* Bottom nav — mobile only */}
			<AppBottomNav />
		</div>
	);
}
