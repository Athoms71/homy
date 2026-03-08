"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMyHouseholds, useHouseholdMembers } from "@/hooks/useHousehold";
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/hooks/useCalendar";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Clock, MapPin, Repeat, Bell, Trash2, Home, CalendarDays } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventColor = "blue" | "green" | "red" | "orange" | "purple" | "pink" | "yellow" | "gray";
type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly" | "yearly";
type ViewMode = "month" | "week" | "day";

// ─── Couleurs — classes COMPLÈTES pour éviter la purge Tailwind ───────────────
// Toutes les classes doivent être écrites en entier, jamais construites dynamiquement

const COLOR_MAP: Record<EventColor, { bg: string; text: string; dot: string; pill: string }> = {
	blue: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", pill: "bg-blue-500 text-white" },
	green: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500", pill: "bg-green-500 text-white" },
	red: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500", pill: "bg-red-500 text-white" },
	orange: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", pill: "bg-orange-500 text-white" },
	purple: { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", pill: "bg-purple-500 text-white" },
	pink: { bg: "bg-pink-100", text: "text-pink-800", dot: "bg-pink-500", pill: "bg-pink-500 text-white" },
	yellow: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", pill: "bg-yellow-500 text-white" },
	gray: { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-500", pill: "bg-gray-500 text-white" },
};

// Pastilles couleur pour le sélecteur (classes bg complètes)
const DOT_CLASSES: Record<EventColor, string> = {
	blue: "bg-blue-500",
	green: "bg-green-500",
	red: "bg-red-500",
	orange: "bg-orange-500",
	purple: "bg-purple-500",
	pink: "bg-pink-500",
	yellow: "bg-yellow-500",
	gray: "bg-gray-500",
};

const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
	none: "Pas de répétition",
	daily: "Chaque jour",
	weekly: "Chaque semaine",
	monthly: "Chaque mois",
	yearly: "Chaque année",
};

const REMINDER_OPTIONS = [
	{ label: "À l'heure", value: 0 },
	{ label: "15 min", value: 15 },
	{ label: "30 min", value: 30 },
	{ label: "1h", value: 60 },
	{ label: "2h", value: 120 },
	{ label: "La veille", value: 1440 },
];

// ─── Helpers date ─────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function startOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeek(d: Date) {
	const r = new Date(d);
	r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
	r.setHours(0, 0, 0, 0);
	return r;
}
function addDays(d: Date, n: number) {
	const r = new Date(d);
	r.setDate(r.getDate() + n);
	return r;
}
function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toDatetimeLocal(iso: string) {
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// ─── EventChip — puce d'événement réutilisable ────────────────────────────────

function EventChip({ event, onClick, compact = false }: { event: any; onClick: (e: any) => void; compact?: boolean }) {
	const c = COLOR_MAP[(event.color ?? "blue") as EventColor];
	return (
		<div
			onClick={(ev) => {
				ev.stopPropagation();
				onClick(event);
			}}
			className={cn("rounded-md cursor-pointer hover:opacity-80 transition truncate", compact ? "text-xs px-1 py-0.5" : "text-xs px-1.5 py-1 mb-0.5", c.bg, c.text)}
		>
			{!event.all_day && !compact && <span className="opacity-60 mr-1">{formatTime(event.starts_at)}</span>}
			{event.title}
		</div>
	);
}

// ─── Modal création / édition ─────────────────────────────────────────────────

function EventModal({
	householdId,
	currentUserId,
	members,
	event,
	defaultDate,
	onClose,
}: {
	householdId: string;
	currentUserId: string;
	members: any[];
	event?: any | null;
	defaultDate?: Date;
	onClose: () => void;
}) {
	const create = useCreateCalendarEvent(householdId);
	const update = useUpdateCalendarEvent(householdId);
	const remove = useDeleteCalendarEvent(householdId);

	const isEdit = !!event;
	const canEdit = !isEdit || event.created_by === currentUserId || members.find((m: any) => m.profiles?.id === currentUserId)?.role === "admin";

	const defaultStart = defaultDate ? `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}T09:00` : toDatetimeLocal(new Date().toISOString());

	const [title, setTitle] = useState(event?.title ?? "");
	const [description, setDescription] = useState(event?.description ?? "");
	const [location, setLocation] = useState(event?.location ?? "");
	const [color, setColor] = useState<EventColor>(event?.color ?? "blue");
	const [startsAt, setStartsAt] = useState(event ? toDatetimeLocal(event.starts_at) : defaultStart);
	const [endsAt, setEndsAt] = useState(event ? toDatetimeLocal(event.ends_at) : defaultStart.replace("T09:00", "T10:00"));
	const [allDay, setAllDay] = useState(event?.all_day ?? false);
	const [recurrence, setRecurrence] = useState<RecurrenceFreq>(event?.recurrence ?? "none");
	const [reminders, setReminders] = useState<number[]>(event?.reminders ?? [60]);

	const colors: EventColor[] = ["blue", "green", "red", "orange", "purple", "pink", "yellow", "gray"];

	const toggleReminder = (val: number) => setReminders((prev) => (prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]));

	const handleSubmit = async () => {
		if (!title.trim()) return;
		const payload = {
			household_id: householdId,
			title: title.trim(),
			description: description || undefined,
			location: location || undefined,
			color,
			starts_at: new Date(startsAt).toISOString(),
			ends_at: new Date(endsAt).toISOString(),
			all_day: allDay,
			recurrence,
			reminders,
		};
		if (isEdit) await update.mutateAsync({ id: event.id, ...payload });
		else await create.mutateAsync(payload);
		onClose();
	};

	const handleDelete = async () => {
		if (!confirm("Supprimer cet événement ?")) return;
		await remove.mutateAsync(event!.id);
		onClose();
	};

	const isPending = create.isPending || update.isPending;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
			<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
					<h2 className="text-lg font-bold text-gray-900">{isEdit ? "Modifier l'événement" : "Nouvel événement"}</h2>
					<div className="flex items-center gap-2">
						{isEdit && canEdit && (
							<button onClick={handleDelete} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition">
								<Trash2 size={18} />
							</button>
						)}
						<button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
							<X size={18} />
						</button>
					</div>
				</div>

				<div className="px-5 py-4 space-y-4">
					{/* Titre */}
					<input
						type="text"
						placeholder="Titre de l'événement"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={!canEdit}
						className="w-full text-lg font-semibold border-0 border-b-2 border-gray-200 focus:border-primary-500 outline-none pb-2 bg-transparent placeholder-gray-300"
					/>

					{/* Couleur */}
					{canEdit && (
						<div className="flex gap-2 flex-wrap">
							{colors.map((c) => (
								<button key={c} onClick={() => setColor(c)} className={cn("w-7 h-7 rounded-full transition ring-offset-2", DOT_CLASSES[c], color === c && "ring-2 ring-gray-400")} />
							))}
						</div>
					)}

					{/* Dates */}
					<div className="space-y-2">
						<label className="flex items-center gap-2 text-sm text-gray-500 font-medium">
							<Clock size={15} /> Horaires
						</label>
						<label className="flex items-center gap-2 text-sm text-gray-600">
							<input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} disabled={!canEdit} />
							Journée entière
						</label>
						{!allDay ? (
							<div className="grid grid-cols-2 gap-2">
								<div>
									<p className="text-xs text-gray-400 mb-1">Début</p>
									<input
										type="datetime-local"
										value={startsAt}
										onChange={(e) => setStartsAt(e.target.value)}
										disabled={!canEdit}
										className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
									/>
								</div>
								<div>
									<p className="text-xs text-gray-400 mb-1">Fin</p>
									<input
										type="datetime-local"
										value={endsAt}
										onChange={(e) => setEndsAt(e.target.value)}
										disabled={!canEdit}
										className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
									/>
								</div>
							</div>
						) : (
							<input
								type="date"
								value={startsAt.split("T")[0]}
								onChange={(e) => {
									setStartsAt(`${e.target.value}T00:00`);
									setEndsAt(`${e.target.value}T23:59`);
								}}
								disabled={!canEdit}
								className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
							/>
						)}
					</div>

					{/* Lieu */}
					<div>
						<label className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1">
							<MapPin size={15} /> Lieu (optionnel)
						</label>
						<input
							type="text"
							placeholder="Adresse ou lieu"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							disabled={!canEdit}
							className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
						/>
					</div>

					{/* Description */}
					<textarea
						placeholder="Description (optionnel)"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						disabled={!canEdit}
						rows={2}
						className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none resize-none"
					/>

					{/* Récurrence */}
					{canEdit && (
						<div>
							<label className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1">
								<Repeat size={15} /> Répétition
							</label>
							<select
								value={recurrence}
								onChange={(e) => setRecurrence(e.target.value as RecurrenceFreq)}
								className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none bg-white"
							>
								{(Object.entries(RECURRENCE_LABELS) as [RecurrenceFreq, string][]).map(([val, label]) => (
									<option key={val} value={val}>
										{label}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Rappels */}
					{canEdit && (
						<div>
							<label className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-2">
								<Bell size={15} /> Rappels
							</label>
							<div className="flex flex-wrap gap-2">
								{REMINDER_OPTIONS.map((opt) => (
									<button
										key={opt.value}
										onClick={() => toggleReminder(opt.value)}
										className={cn(
											"text-xs px-3 py-1.5 rounded-full border transition",
											reminders.includes(opt.value) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300",
										)}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{canEdit && (
					<div className="px-5 pb-6 pt-2">
						<button
							onClick={handleSubmit}
							disabled={!title.trim() || isPending}
							className="w-full bg-primary-600 text-white font-semibold py-3 rounded-2xl hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{isPending && <Loader2 size={16} className="animate-spin" />}
							{isEdit ? "Enregistrer" : "Créer l'événement"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Vue Mois ─────────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, today, onDayClick, onEventClick }: { currentDate: Date; events: any[]; today: Date; onDayClick: (d: Date) => void; onEventClick: (e: any) => void }) {
	const gridStart = startOfWeek(startOfMonth(currentDate));
	const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

	const eventsByDay = useMemo(() => {
		const map = new Map<string, any[]>();
		events.forEach((ev) => {
			const key = new Date(ev.starts_at).toDateString();
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(ev);
		});
		return map;
	}, [events]);

	return (
		<div>
			<div className="grid grid-cols-7 mb-1">
				{DAYS_FR.map((d) => (
					<div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
						{d}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
				{days.map((day, i) => {
					const isCurrentMonth = day.getMonth() === currentDate.getMonth();
					const isToday = isSameDay(day, today);
					const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
					// All-day en premier
					const sorted = [...dayEvents].sort((a, b) => (b.all_day ? 1 : 0) - (a.all_day ? 1 : 0));

					return (
						<div
							key={i}
							onClick={() => onDayClick(day)}
							className={cn("bg-white min-h-[80px] p-1 cursor-pointer hover:bg-gray-50 transition select-none", !isCurrentMonth && "opacity-40")}
						>
							<span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto mb-1", isToday ? "bg-primary-600 text-white" : "text-gray-700")}>
								{day.getDate()}
							</span>
							<div>
								{sorted.slice(0, 2).map((ev: any) => (
									<EventChip key={ev.id} event={ev} onClick={onEventClick} compact />
								))}
								{sorted.length > 2 && <div className="text-xs text-gray-400 pl-1">+{sorted.length - 2}</div>}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Vue Semaine & Jour — partagent la même grille horaire ────────────────────

function TimeGridView({ days, events, today, onSlotClick, onEventClick }: { days: Date[]; events: any[]; today: Date; onSlotClick: (d: Date, h: number) => void; onEventClick: (e: any) => void }) {
	const hours = Array.from({ length: 24 }, (_, i) => i);

	const allDayEvents = useMemo(() => events.filter((ev) => ev.all_day).filter((ev) => days.some((d) => isSameDay(d, new Date(ev.starts_at)))), [events, days]);

	const timedByDayHour = useMemo(() => {
		const map = new Map<string, any[]>();
		events
			.filter((ev) => !ev.all_day)
			.forEach((ev) => {
				const d = new Date(ev.starts_at);
				const key = `${d.toDateString()}-${d.getHours()}`;
				if (!map.has(key)) map.set(key, []);
				map.get(key)!.push(ev);
			});
		return map;
	}, [events]);

	const colCount = days.length + 1; // +1 pour la colonne des heures

	return (
		<div className="overflow-x-auto">
			{/* Header jours */}
			<div className={`grid min-w-[320px]`} style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}>
				<div />
				{days.map((day, i) => (
					<div key={i} className="text-center py-2 cursor-pointer" onClick={() => onSlotClick(day, 9)}>
						<p className="text-xs text-gray-400 font-medium">{days.length === 1 ? DAYS_FULL[(day.getDay() + 6) % 7] : DAYS_FR[(day.getDay() + 6) % 7]}</p>
						<span
							className={cn(
								"text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-0.5",
								isSameDay(day, today) ? "bg-primary-600 text-white" : "text-gray-700",
							)}
						>
							{day.getDate()}
						</span>
					</div>
				))}
			</div>

			{/* Bande all-day */}
			{allDayEvents.length > 0 && (
				<div className="grid min-w-[320px] border-b border-gray-100 pb-1" style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}>
					<div className="text-right pr-2 text-xs text-gray-300 pt-1"></div>
					{days.map((day, di) => {
						const dayAllDay = allDayEvents.filter((ev) => isSameDay(new Date(ev.starts_at), day));
						return (
							<div key={di} className="px-0.5">
								{dayAllDay.map((ev: any) => (
									<EventChip key={ev.id} event={ev} onClick={onEventClick} />
								))}
							</div>
						);
					})}
				</div>
			)}

			{/* Grille horaire */}
			<div className="relative min-w-[320px] max-h-[60vh] overflow-y-auto border border-gray-100 rounded-2xl">
				{hours.map((h) => (
					<div key={h} className="grid border-b border-gray-50 last:border-0" style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}>
						<div className="text-right pr-2 text-xs text-gray-300 py-2 sticky left-0 bg-white">{pad(h)}:00</div>
						{days.map((day, di) => {
							const key = `${day.toDateString()}-${h}`;
							const slotEvents = timedByDayHour.get(key) ?? [];
							return (
								<div key={di} onClick={() => onSlotClick(day, h)} className="border-l border-gray-50 min-h-[44px] p-0.5 cursor-pointer hover:bg-gray-50 transition">
									{slotEvents.map((ev: any) => (
										<EventChip key={ev.id} event={ev} onClick={onEventClick} />
									))}
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CalendarPage() {
	const { data: householdsData, isLoading: loadingHouseholds } = useMyHouseholds();
	const [householdId, setHouseholdId] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [view, setView] = useState<ViewMode>("month");
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [newEventDate, setNewEventDate] = useState<Date | undefined>();
	const [newEventHour, setNewEventHour] = useState<number>(9);

	const today = useMemo(() => new Date(), []);

	useEffect(() => {
		createClient()
			.auth.getUser()
			.then(({ data }) => setCurrentUserId(data.user?.id ?? null));
	}, []);

	useEffect(() => {
		if (householdsData?.length && !householdId) setHouseholdId((householdsData[0] as any).households.id);
	}, [householdsData, householdId]);

	const { data: membersData = [] } = useHouseholdMembers(householdId);

	// Jours affichés selon la vue
	const viewDays = useMemo(() => {
		if (view === "day") return [currentDate];
		if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));
		return []; // mois : géré par MonthView
	}, [view, currentDate]);

	// Plage de dates à charger
	const { from, to } = useMemo(() => {
		if (view === "month") {
			const s = startOfWeek(startOfMonth(currentDate));
			return { from: s.toISOString(), to: addDays(s, 42).toISOString() };
		}
		if (view === "week") {
			const s = startOfWeek(currentDate);
			return { from: s.toISOString(), to: addDays(s, 7).toISOString() };
		}
		// day
		const s = new Date(currentDate);
		s.setHours(0, 0, 0, 0);
		const e = new Date(currentDate);
		e.setHours(23, 59, 59, 999);
		return { from: s.toISOString(), to: e.toISOString() };
	}, [view, currentDate]);

	const { data: events = [], isLoading } = useCalendarEvents(householdId, from, to);

	// Navigation
	const navigate = (dir: -1 | 1) => {
		setCurrentDate((prev) => {
			const d = new Date(prev);
			if (view === "month") d.setMonth(d.getMonth() + dir);
			else if (view === "week") d.setDate(d.getDate() + dir * 7);
			else d.setDate(d.getDate() + dir);
			return d;
		});
	};

	const headerLabel = useMemo(() => {
		if (view === "month") return `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
		if (view === "week") {
			const ws = startOfWeek(currentDate);
			const we = addDays(ws, 6);
			return `${ws.getDate()} – ${we.getDate()} ${MONTHS_FR[we.getMonth()]} ${we.getFullYear()}`;
		}
		return currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
	}, [view, currentDate]);

	// Clic sur un jour dans la vue mois → zoom vue jour
	const handleDayClick = (date: Date) => {
		setCurrentDate(date);
		setView("day");
	};

	// Clic sur un créneau dans vue semaine/jour → ouvrir modal création
	const handleSlotClick = (date: Date, hour: number) => {
		setNewEventDate(date);
		setNewEventHour(hour);
		setSelectedEvent(null);
		setShowModal(true);
	};

	const handleEventClick = (event: any) => {
		setSelectedEvent(event);
		setNewEventDate(undefined);
		setShowModal(true);
	};

	const openCreateModal = () => {
		setSelectedEvent(null);
		setNewEventDate(today);
		setNewEventHour(9);
		setShowModal(true);
	};

	// Date avec heure pour le modal
	const modalDefaultDate = useMemo(() => {
		if (!newEventDate) return undefined;
		const d = new Date(newEventDate);
		d.setHours(newEventHour, 0, 0, 0);
		return d;
	}, [newEventDate, newEventHour]);

	if (loadingHouseholds)
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="animate-spin text-primary-600" size={32} />
			</div>
		);

	if (!householdsData?.length)
		return (
			<div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
				<Home size={40} className="mx-auto text-gray-300 mb-4" />
				<h2 className="font-semibold text-gray-600 mb-1">Aucun foyer</h2>
				<p className="text-gray-400 text-sm mb-4">Tu dois créer ou rejoindre un foyer.</p>
				<Link href="/household" className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">
					Gérer mes foyers
				</Link>
			</div>
		);

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-5">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">📅 Calendrier</h1>
					<p className="text-gray-500 text-sm mt-1">Événements du foyer</p>
				</div>
				<button onClick={openCreateModal} className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition">
					<Plus size={16} />
					<span className="hidden sm:inline">Ajouter</span>
				</button>
			</div>

			{/* Barre navigation */}
			<div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-gray-200 px-4 py-3">
				<div className="flex items-center gap-1">
					<button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
						<ChevronLeft size={18} className="text-gray-600" />
					</button>
					<button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
						<ChevronRight size={18} className="text-gray-600" />
					</button>
					<h2 className="font-semibold text-gray-900 ml-2 text-sm sm:text-base capitalize">{headerLabel}</h2>
				</div>

				<div className="flex items-center gap-1">
					<button
						onClick={() => {
							setCurrentDate(new Date());
							setView("day");
						}}
						className="text-xs text-primary-600 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition mr-1"
					>
						Aujourd'hui
					</button>
					{/* Toggle vue */}
					<div className="flex bg-gray-100 rounded-xl p-1">
						{(["month", "week", "day"] as ViewMode[]).map((v) => (
							<button
								key={v}
								onClick={() => setView(v)}
								className={cn("text-xs font-medium px-2.5 py-1.5 rounded-lg transition", view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}
							>
								{v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Contenu */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="animate-spin text-primary-600" size={24} />
				</div>
			) : view === "month" ? (
				<MonthView currentDate={currentDate} events={events} today={today} onDayClick={handleDayClick} onEventClick={handleEventClick} />
			) : (
				<TimeGridView days={viewDays} events={events} today={today} onSlotClick={handleSlotClick} onEventClick={handleEventClick} />
			)}

			{/* Modal */}
			{showModal && householdId && currentUserId && (
				<EventModal
					householdId={householdId}
					currentUserId={currentUserId}
					members={membersData}
					event={selectedEvent}
					defaultDate={modalDefaultDate}
					onClose={() => {
						setShowModal(false);
						setSelectedEvent(null);
					}}
				/>
			)}
		</div>
	);
}
