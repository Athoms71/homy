"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRouter } from "next/navigation";
import { User, Bell, Loader2, Check, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
	return (
		<div className="mx-auto bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
			<div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
				<Icon size={17} className="text-gray-400" />
				<h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
			</div>
			<div className="p-5 space-y-4">{children}</div>
		</div>
	);
}

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

function NotificationsSection() {
	const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
	const statusLabel = { default: "Désactivées", granted: isSubscribed ? "Activées" : "Désactivées", denied: "Bloquées par le navigateur", unsupported: "Non supportées" }[permission];
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

export default function SettingsPage() {
	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">⚙️ Paramètres</h1>
				<p className="text-gray-500 text-sm mt-1">Gère ton profil et tes préférences</p>
			</div>
			<div className="w-4/5 mx-auto w-full space-y-4">
				<ProfileSection />
				<NotificationsSection />
				<AccountSection />
			</div>
		</div>
	);
}
