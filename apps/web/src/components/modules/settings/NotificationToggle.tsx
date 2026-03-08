"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

export function NotificationToggle() {
	const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

	// Navigateur ne supporte pas les notifs (pas de SW ou pas de PushManager)
	if (permission === "unsupported") {
		return (
			<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
				<BellOff size={20} className="text-gray-400 flex-shrink-0" />
				<div>
					<p className="text-sm font-medium text-gray-600">Notifications non supportées</p>
					<p className="text-xs text-gray-400 mt-0.5">Installe l'application sur ton téléphone pour activer les notifications.</p>
				</div>
			</div>
		);
	}

	// L'utilisateur a explicitement refusé
	if (permission === "denied") {
		return (
			<div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-200">
				<BellOff size={20} className="text-orange-500 flex-shrink-0" />
				<div>
					<p className="text-sm font-medium text-orange-800">Notifications bloquées</p>
					<p className="text-xs text-orange-600 mt-0.5">Autorise les notifications dans les paramètres de ton navigateur.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200">
			<div className="flex items-center gap-3">
				<div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isSubscribed ? "bg-primary-100" : "bg-gray-100")}>
					{isLoading ? (
						<Loader2 size={18} className="animate-spin text-gray-500" />
					) : isSubscribed ? (
						<Bell size={18} className="text-primary-600" />
					) : (
						<BellOff size={18} className="text-gray-500" />
					)}
				</div>
				<div>
					<p className="text-sm font-semibold text-gray-800">{isSubscribed ? "Notifications activées" : "Notifications désactivées"}</p>
					<p className="text-xs text-gray-400 mt-0.5">{isSubscribed ? "Tu recevras des rappels pour tes événements." : "Active pour recevoir des rappels d'événements."}</p>
				</div>
			</div>

			{/* Toggle switch */}
			<button
				onClick={isSubscribed ? unsubscribe : subscribe}
				disabled={isLoading}
				className={cn(
					"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
					isSubscribed ? "bg-primary-600" : "bg-gray-300",
					isLoading && "opacity-50 cursor-not-allowed",
				)}
				role="switch"
				aria-checked={isSubscribed}
			>
				<span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", isSubscribed ? "translate-x-6" : "translate-x-1")} />
			</button>
		</div>
	);
}
