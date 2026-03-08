"use client";

import Link from "next/link";
import { useUpcomingEvents } from "@/hooks/useCalendar";
import { ArrowRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type EventColor = "blue" | "green" | "red" | "orange" | "purple" | "pink" | "yellow" | "gray";

const COLOR_MAP: Record<EventColor, { bg: string; text: string; bar: string }> = {
	blue: { bg: "bg-blue-100", text: "text-blue-800", bar: "bg-blue-400" },
	green: { bg: "bg-green-100", text: "text-green-800", bar: "bg-green-400" },
	red: { bg: "bg-red-100", text: "text-red-800", bar: "bg-red-400" },
	orange: { bg: "bg-orange-100", text: "text-orange-800", bar: "bg-orange-400" },
	purple: { bg: "bg-purple-100", text: "text-purple-800", bar: "bg-purple-400" },
	pink: { bg: "bg-pink-100", text: "text-pink-800", bar: "bg-pink-400" },
	yellow: { bg: "bg-yellow-100", text: "text-yellow-800", bar: "bg-yellow-400" },
	gray: { bg: "bg-gray-100", text: "text-gray-800", bar: "bg-gray-400" },
};

interface Props {
	householdId: string;
}

function formatEventDate(startsAt: string, allDay: boolean): string {
	const date = new Date(startsAt);
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);

	const isToday = date.toDateString() === today.toDateString();
	const isTomorrow = date.toDateString() === tomorrow.toDateString();

	const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

	if (allDay) return dayLabel;

	const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
	return `${dayLabel} · ${time}`;
}

export function CalendarWidget({ householdId }: Props) {
	const { data: events = [], isLoading } = useUpcomingEvents(householdId, 4);

	return (
		<div className="bg-white rounded-2xl border border-gray-200 p-5">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<span className="text-xl">📅</span>
					<h2 className="font-bold text-gray-800">À venir</h2>
				</div>
				<Link href="/calendar" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
					Calendrier <ArrowRight size={12} />
				</Link>
			</div>

			{/* Contenu */}
			{isLoading ? (
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
					))}
				</div>
			) : events.length === 0 ? (
				<div className="text-center py-4">
					<CalendarDays size={28} className="mx-auto text-gray-300 mb-2" />
					<p className="text-gray-400 text-sm">Aucun événement à venir</p>
					<Link href="/calendar" className="text-primary-600 text-xs hover:underline">
						Ajouter un événement →
					</Link>
				</div>
			) : (
				<div className="space-y-2">
					{events.map((event: any) => {
						const color = (event.color ?? "blue") as EventColor;
						const colorClasses = COLOR_MAP[color];

						return (
							<Link key={event.id} href="/calendar" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:opacity-80", colorClasses.bg)}>
								{/* Barre couleur */}
								<div className={cn("w-1 h-8 rounded-full flex-shrink-0", COLOR_MAP[color].bar)} />

								{/* Infos */}
								<div className="flex-1 min-w-0">
									<p className={cn("text-sm font-semibold truncate", colorClasses.text)}>{event.title}</p>
									<p className={cn("text-xs opacity-70", colorClasses.text)}>{formatEventDate(event.starts_at, event.all_day)}</p>
								</div>

								{/* Lieu si présent */}
								{event.location && <p className="text-xs text-gray-400 truncate max-w-[80px] hidden sm:block">📍 {event.location}</p>}
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
