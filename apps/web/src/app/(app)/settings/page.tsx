"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMyHouseholds } from "@/hooks/useHousehold";
import { leaveHousehold } from "@/services/household.service";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRouter } from "next/navigation";
import { User, Bell, Home, Loader2, Check, LogOut, Trash2, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
	return (
		<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
			<div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
				<Icon size={17} className="text-gray-400" />
				<h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
			</div>
			<div className="p-5 space-y-4">{children}</div>
		</div>
	);
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
	return (
		<button
			onClick={() => !disabled && onChange(!checked)}
			disabled={disabled}
			className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", checked ? "bg-primary-600" : "bg-gray-200", disabled && "opacity-50 cursor-not-allowed")}
		>
			<span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
		</button>
	);
}

// ─── Section Profil ───────────────────────────────────────────────────────────

function ProfileSection() {
	const supabase = createClient();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		supabase.auth.getUser().then(async ({ data }) => {
			const user = data.user;
			if (!user) return;
			setUserId(user.id);
			setEmail(user.email ?? "");

			const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

			if (profile) setName(profile.name ?? "");
		});
	}, []);

	const handleSave = async () => {
		if (!userId || !name.trim()) return;
		setSaving(true);
		try {
			await supabase.from("profiles").update({ name: name.trim() }).eq("id", userId);
			await supabase.auth.updateUser({ data: { name: name.trim() } });
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} finally {
			setSaving(false);
		}
	};

	const initials = name
		? name
				.split(" ")
				.map((w) => w[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<Section title="Profil" icon={User}>
			<div className="flex items-center gap-4">
				<div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
					<span className="text-primary-700 font-bold text-xl">{initials}</span>
				</div>
				<div>
					<p className="font-semibold text-gray-800">{name || "Sans nom"}</p>
					<p className="text-sm text-gray-400">{email}</p>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Nom affiché</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Ton prénom"
					className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-primary-500 outline-none"
				/>
			</div>

			<button
				onClick={handleSave}
				disabled={saving || !name.trim()}
				className="flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
			>
				{saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
				{saved ? "Enregistré !" : "Enregistrer"}
			</button>
		</Section>
	);
}

// ─── Section Notifications ────────────────────────────────────────────────────

function NotificationsSection() {
	const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

	const statusLabel = {
		default: "Désactivées",
		granted: isSubscribed ? "Activées" : "Désactivées",
		denied: "Bloquées par le navigateur",
		unsupported: "Non supportées",
	}[permission];

	const canToggle = permission !== "denied" && permission !== "unsupported";

	return (
		<Section title="Notifications" icon={Bell}>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-gray-800">Rappels d'événements</p>
					<p className="text-xs text-gray-400 mt-0.5">{statusLabel}</p>
					{permission === "denied" && <p className="text-xs text-orange-500 mt-1">Autorise les notifications dans les paramètres de ton navigateur</p>}
				</div>
				<Toggle checked={isSubscribed} onChange={(v) => (v ? subscribe() : unsubscribe())} disabled={isLoading || !canToggle} />
			</div>

			{isSubscribed && (
				<div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
					<Check size={14} className="text-green-600 flex-shrink-0" />
					<p className="text-xs text-green-700">Tu recevras des notifications avant tes événements.</p>
				</div>
			)}
		</Section>
	);
}

// ─── Section Foyer ────────────────────────────────────────────────────────────

function HouseholdSection() {
	const router = useRouter();
	const supabase = createClient();
	const { data: householdsData = [] } = useMyHouseholds();
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [leaving, setLeaving] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<string | null>(null);

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
	}, []);

	const handleLeave = async (householdId: string) => {
		if (!confirm("Quitter ce foyer ? Tu perdras accès à toutes ses données.")) return;
		setLeaving(householdId);
		try {
			await leaveHousehold(householdId);
			router.refresh();
		} finally {
			setLeaving(null);
		}
	};

	const handleDelete = async (householdId: string) => {
		if (!confirm("Supprimer définitivement ce foyer ? Cette action est irréversible.")) return;
		setDeleting(householdId);
		try {
			await supabase.from("households").delete().eq("id", householdId);
			router.refresh();
		} finally {
			setDeleting(null);
		}
	};

	if (!householdsData.length) {
		return (
			<Section title="Mon foyer" icon={Home}>
				<p className="text-sm text-gray-400 text-center py-2">Aucun foyer — rejoins ou crée-en un.</p>
			</Section>
		);
	}

	return (
		<Section title="Mon foyer" icon={Home}>
			{householdsData.map((h: any) => {
				const household = h.households;
				const isAdmin = h.role === "admin";
				const isCreator = household.created_by === currentUserId;

				return (
					<div key={household.id} className="border border-gray-100 rounded-2xl overflow-hidden">
						<div className="flex items-center justify-between px-4 py-3 bg-gray-50">
							<div>
								<p className="font-semibold text-gray-800">{household.name}</p>
								<p className="text-xs text-gray-400 mt-0.5">
									{isAdmin ? "👑 Admin" : "👤 Membre"} · Code : {household.invite_code}
								</p>
							</div>
						</div>

						<div className="divide-y divide-gray-50">
							<button onClick={() => handleLeave(household.id)} disabled={!!leaving} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left">
								<div className="flex items-center gap-3">
									<LogOut size={16} className="text-orange-400" />
									<span className="text-sm text-gray-700">Quitter le foyer</span>
								</div>
								{leaving === household.id ? <Loader2 size={15} className="animate-spin text-gray-400" /> : <ChevronRight size={15} className="text-gray-300" />}
							</button>

							{(isAdmin || isCreator) && (
								<button
									onClick={() => handleDelete(household.id)}
									disabled={!!deleting}
									className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 transition text-left"
								>
									<div className="flex items-center gap-3">
										<Trash2 size={16} className="text-red-400" />
										<span className="text-sm text-red-600">Supprimer le foyer</span>
									</div>
									{deleting === household.id ? <Loader2 size={15} className="animate-spin text-red-400" /> : <ChevronRight size={15} className="text-gray-300" />}
								</button>
							)}
						</div>
					</div>
				);
			})}
		</Section>
	);
}

// ─── Section Compte ───────────────────────────────────────────────────────────

function AccountSection() {
	const supabase = createClient();
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleSignOut = async () => {
		setLoading(true);
		await supabase.auth.signOut();
		router.push("/login");
	};

	return (
		<Section title="Compte" icon={Shield}>
			<button
				onClick={handleSignOut}
				disabled={loading}
				className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-red-100 text-red-600 hover:bg-red-50 transition text-sm font-medium"
			>
				{loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
				Se déconnecter
			</button>
		</Section>
	);
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SettingsPage() {
	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">⚙️ Paramètres</h1>
				<p className="text-gray-500 text-sm mt-1">Gère ton profil et tes préférences</p>
			</div>

			<div className="max-w-lg space-y-4">
				<ProfileSection />
				<NotificationsSection />
				<HouseholdSection />
				<AccountSection />
			</div>
		</div>
	);
}
