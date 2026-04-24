"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMyHouseholds, useHouseholdMembers } from "@/hooks/useHousehold";
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/hooks/useCalendar";
import { Settings, ChevronLeft, ChevronRight, Plus, X, Loader2, Clock, MapPin, Bell, Trash2, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useHouseholdStore } from "@/store/householdStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventColor = "blue" | "green" | "red" | "orange" | "purple" | "pink" | "yellow" | "gray";
type ViewMode = "month" | "day";

const COLOR_MAP: Record<EventColor, { bar: string; bg: string; text: string }> = {
	blue: { bar: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-800" },
	green: { bar: "bg-green-500", bg: "bg-green-50", text: "text-green-800" },
	red: { bar: "bg-red-500", bg: "bg-red-50", text: "text-red-800" },
	orange: { bar: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-800" },
	purple: { bar: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-800" },
	pink: { bar: "bg-pink-500", bg: "bg-pink-50", text: "text-pink-800" },
	yellow: { bar: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-800" },
	gray: { bar: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-800" },
};

const DOT_CLASSES: Record<EventColor, string> = {
	blue: "bg-blue-500",
	green: "bg-green-500",
	red: "bg-red-500",
	orange: "bg-orange-500",
	purple: "bg-purple-500",
	pink: "bg-pink-500",
	yellow: "bg-yellow-500",
	gray: "bg-gray-400",
};

const REMINDER_OPTIONS = [
	{ label: "À l'heure", value: 0 },
	{ label: "15 min", value: 15 },
	{ label: "30 min", value: 30 },
	{ label: "1h", value: 60 },
	{ label: "2h", value: 120 },
	{ label: "La veille", value: 1440 },
];

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pad = (n: number) => String(n).padStart(2, "0");

function startOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), 1);
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

// Vérifie si un event multi-jours couvre ce jour
function eventCoversDay(ev: any, day: Date): boolean {
	const start = new Date(ev.starts_at);
	const end = new Date(ev.ends_at);
	start.setHours(0, 0, 0, 0);
	end.setHours(23, 59, 59, 999);
	const d = new Date(day);
	d.setHours(12, 0, 0, 0);
	return d >= start && d <= end;
}

function isFirstDayOfEvent(ev: any, day: Date): boolean {
	return isSameDay(new Date(ev.starts_at), day);
}

// ─── EventBar — barre style Google Calendar ───────────────────────────────────

function EventBar({ event, onClick, isStart, isEnd, isMultiDay }: { event: any; onClick: (e: any) => void; isStart: boolean; isEnd: boolean; isMultiDay: boolean }) {
	const color = (event.color ?? "blue") as EventColor;
	const c = COLOR_MAP[color];
	return (
		<div
			onClick={(e) => {
				e.stopPropagation();
				onClick(event);
			}}
			className={cn(
				"flex items-center gap-1 text-xs font-medium cursor-pointer truncate transition hover:opacity-80 h-5 mb-0.5",
				isMultiDay ? cn(c.bar, "text-white px-1", isStart ? "rounded-l-full pl-2" : "", isEnd ? "rounded-r-full pr-2" : "") : cn(c.bg, c.text, "rounded-full px-1.5"),
			)}
		>
			{isStart && !event.all_day && <span className={cn("opacity-80 mr-0.5 shrink-0", isMultiDay ? "text-white" : "")}>{formatTime(event.starts_at)}</span>}
			{(isStart || !isMultiDay) && <span className="truncate">{event.title}</span>}
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
	const [confirmDelete, setConfirmDelete] = useState(false);

	const isEdit = !!event;
	const canEdit = !isEdit || event.created_by === currentUserId || members.find((m: any) => m.profiles?.id === currentUserId)?.role === "admin";

	const defaultDateStr = defaultDate ? `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}` : new Date().toISOString().split("T")[0];

	const [title, setTitle] = useState(event?.title ?? "");
	const [description, setDescription] = useState(event?.description ?? "");
	const [location, setLocation] = useState(event?.location ?? "");
	const [color, setColor] = useState<EventColor>(event?.color ?? "blue");
	const [allDay, setAllDay] = useState(event?.all_day ?? true);
	const [startDate, setStartDate] = useState(event ? toDatetimeLocal(event.starts_at).split("T")[0] : defaultDateStr);
	const [endDate, setEndDate] = useState(event ? toDatetimeLocal(event.ends_at).split("T")[0] : defaultDateStr);
	const [startTime, setStartTime] = useState(event && !event.all_day ? toDatetimeLocal(event.starts_at).split("T")[1] : "09:00");
	const [endTime, setEndTime] = useState(event && !event.all_day ? toDatetimeLocal(event.ends_at).split("T")[1] : "10:00");
	const [reminders, setReminders] = useState<number[]>(event?.reminders ?? [60]);

	const colors: EventColor[] = ["blue", "green", "red", "orange", "purple", "pink", "yellow", "gray"];
	const toggleReminder = (val: number) => setReminders((prev) => (prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]));

	const handleSubmit = async () => {
		if (!title.trim()) return;
		const starts = allDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}`);
		const ends = allDay ? new Date(`${endDate}T23:59:59`) : new Date(`${endDate}T${endTime}`);
		const payload = {
			household_id: householdId,
			title: title.trim(),
			description: description || undefined,
			location: location || undefined,
			color,
			starts_at: starts.toISOString(),
			ends_at: ends.toISOString(),
			all_day: allDay,
			reminders,
		};
		if (isEdit) await update.mutateAsync({ id: event.id, ...payload });
		else await create.mutateAsync(payload);
		onClose();
	};

	const isPending = create.isPending || update.isPending;

	return (
		<>
			<div className="fixed bottom-16 sm:bottom-0 inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
				<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[70vh] sm:max-h-[80vh] overflow-y-auto pb-safe">
					<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
						<h2 className="text-lg font-bold text-gray-900">{isEdit ? "Modifier l'événement" : "Nouvel événement"}</h2>
						<div className="flex items-center gap-2">
							{isEdit && canEdit && (
								<button onClick={() => setConfirmDelete(true)} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition">
									<Trash2 size={18} />
								</button>
							)}
							<button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
								<X size={18} />
							</button>
						</div>
					</div>

					<div className="px-5 py-4 space-y-4">
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
									<button
										key={c}
										onClick={() => setColor(c)}
										className={cn("w-7 h-7 rounded-full transition ring-offset-2", DOT_CLASSES[c], color === c && "ring-2 ring-gray-400")}
									/>
								))}
							</div>
						)}

						{/* Dates */}
						<div className="space-y-3">
							<label className="flex items-center gap-2 text-sm text-gray-500 font-medium">
								<Clock size={15} /> Dates
							</label>
							<label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
								<input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} disabled={!canEdit} className="rounded" />
								Journée(s) entière(s)
							</label>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<p className="text-xs text-gray-400 mb-1">Début</p>
									<input
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
										disabled={!canEdit}
										className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
									/>
								</div>
								<div>
									<p className="text-xs text-gray-400 mb-1">Fin</p>
									<input
										type="date"
										value={endDate}
										onChange={(e) => setEndDate(e.target.value)}
										disabled={!canEdit}
										className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
									/>
								</div>
							</div>
							{!allDay && (
								<div className="grid grid-cols-2 gap-2">
									<div>
										<p className="text-xs text-gray-400 mb-1">Heure début</p>
										<input
											type="time"
											value={startTime}
											onChange={(e) => setStartTime(e.target.value)}
											disabled={!canEdit}
											className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
										/>
									</div>
									<div>
										<p className="text-xs text-gray-400 mb-1">Heure fin</p>
										<input
											type="time"
											value={endTime}
											onChange={(e) => setEndTime(e.target.value)}
											disabled={!canEdit}
											className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
										/>
									</div>
								</div>
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
						<div className="px-5 pb-8 pt-2">
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

			{confirmDelete && (
				<ConfirmDialog
					message="Supprimer cet événement ?"
					onConfirm={async () => {
						await remove.mutateAsync(event!.id);
						onClose();
					}}
					onCancel={() => setConfirmDelete(false)}
				/>
			)}
		</>
	);
}

// ─── Vue Mois ─────────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, today, onDayClick, onEventClick }: { currentDate: Date; events: any[]; today: Date; onDayClick: (d: Date) => void; onEventClick: (e: any) => void }) {
	const gridStart = startOfWeek(startOfMonth(currentDate));
	const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

	// Pour chaque jour, trouver les events qui couvrent ce jour
	// On trie: all_day multi-jour en premier, puis single-day, puis timed
	const getEventsForDay = useCallback(
		(day: Date) => {
			return events
				.filter((ev) => eventCoversDay(ev, day))
				.sort((a, b) => {
					const aMulti = a.all_day && new Date(a.starts_at).toDateString() !== new Date(a.ends_at).toDateString();
					const bMulti = b.all_day && new Date(b.starts_at).toDateString() !== new Date(b.ends_at).toDateString();
					if (aMulti && !bMulti) return -1;
					if (!aMulti && bMulti) return 1;
					if (a.all_day && !b.all_day) return -1;
					if (!a.all_day && b.all_day) return 1;
					return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
				});
		},
		[events],
	);

	return (
		<div>
			<div className="grid grid-cols-7 mb-1">
				{DAYS_FR.map((d) => (
					<div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
						{d}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7 border border-gray-100 rounded-2xl overflow-hidden">
				{days.map((day, i) => {
					const isCurrentMonth = day.getMonth() === currentDate.getMonth();
					const isToday = isSameDay(day, today);
					const dayEvents = getEventsForDay(day);
					const visible = dayEvents.slice(0, 3);
					const hidden = dayEvents.length - 3;

					return (
						<div
							key={i}
							onClick={() => onDayClick(day)}
							className={cn(
								"min-h-[80px] p-1 cursor-pointer hover:bg-gray-50 transition select-none border-b border-r border-gray-100 last:border-r-0",
								!isCurrentMonth && "opacity-40",
								i % 7 === 6 && "border-r-0",
								i >= 35 && "border-b-0",
							)}
						>
							<span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto mb-0.5", isToday ? "bg-primary-600 text-white" : "text-gray-700")}>
								{day.getDate()}
							</span>
							<div className="space-y-0.5">
								{visible.map((ev) => {
									const isMultiDay = ev.all_day && !isSameDay(new Date(ev.starts_at), new Date(ev.ends_at));
									const isStart = isFirstDayOfEvent(ev, day);
									const isEnd = isSameDay(new Date(ev.ends_at), day);
									return <EventBar key={ev.id} event={ev} onClick={onEventClick} isStart={isStart} isEnd={isEnd} isMultiDay={isMultiDay} />;
								})}
								{hidden > 0 && (
									<div className="text-xs text-gray-400 pl-1">
										+{hidden} autre{hidden > 1 ? "s" : ""}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Vue Jour ─────────────────────────────────────────────────────────────────

function DayView({ day, events, onEventClick, onSlotClick }: { day: Date; events: any[]; onEventClick: (e: any) => void; onSlotClick: (h: number) => void }) {
	const hours = Array.from({ length: 24 }, (_, i) => i);

	const allDayEvs = events.filter((ev) => ev.all_day && eventCoversDay(ev, day));
	const timedEvs = events.filter((ev) => !ev.all_day && eventCoversDay(ev, day));

	const timedByHour = useMemo(() => {
		const map = new Map<number, any[]>();
		timedEvs.forEach((ev) => {
			const h = new Date(ev.starts_at).getHours();
			if (!map.has(h)) map.set(h, []);
			map.get(h)!.push(ev);
		});
		return map;
	}, [timedEvs]);

	return (
		<div>
			{/* All-day events */}
			{allDayEvs.length > 0 && (
				<div className="mb-2 p-2 bg-gray-50 rounded-xl space-y-1">
					<p className="text-xs text-gray-400 font-medium px-1">Journée entière</p>
					{allDayEvs.map((ev) => (
						<EventBar
							key={ev.id}
							event={ev}
							onClick={onEventClick}
							isStart={isSameDay(new Date(ev.starts_at), day)}
							isEnd={isSameDay(new Date(ev.ends_at), day)}
							isMultiDay={!isSameDay(new Date(ev.starts_at), new Date(ev.ends_at))}
						/>
					))}
				</div>
			)}

			{/* Grille horaire */}
			<div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[65vh] overflow-y-auto">
				{hours.map((h) => {
					const slotEvents = timedByHour.get(h) ?? [];
					return (
						<div key={h} onClick={() => onSlotClick(h)} className="flex gap-2 border-b border-gray-50 last:border-0 min-h-[52px] cursor-pointer hover:bg-gray-50 transition px-3 py-1">
							<span className="text-xs text-gray-300 w-10 shrink-0 pt-1">{pad(h)}:00</span>
							<div className="flex-1">
								{slotEvents.map((ev) => {
									const color = (ev.color ?? "blue") as EventColor;
									const c = COLOR_MAP[color];
									return (
										<div
											key={ev.id}
											onClick={(e) => {
												e.stopPropagation();
												onEventClick(ev);
											}}
											className={cn("flex items-center gap-2 rounded-lg px-2 py-1 mb-1 cursor-pointer hover:opacity-80 transition", c.bg)}
										>
											<div className={cn("w-1 h-full min-h-[20px] rounded-full shrink-0", c.bar)} />
											<div>
												<p className={cn("text-xs font-semibold", c.text)}>{ev.title}</p>
												<p className="text-xs text-gray-400">
													{formatTime(ev.starts_at)} – {formatTime(ev.ends_at)}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CalendarPage() {
	const { data: householdsData, isLoading: loadingHouseholds } = useMyHouseholds();
	const householdId = useHouseholdStore((state) => state.activeHouseholdId);
	const setHouseholdId = useHouseholdStore((state) => state.setActiveHouseholdId);
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

	// Plage de dates
	const { from, to } = useMemo(() => {
		if (view === "month") {
			const s = startOfWeek(startOfMonth(currentDate));
			return { from: s.toISOString(), to: addDays(s, 42).toISOString() };
		}
		const s = new Date(currentDate);
		s.setHours(0, 0, 0, 0);
		const e = new Date(currentDate);
		e.setHours(23, 59, 59, 999);
		return { from: s.toISOString(), to: e.toISOString() };
	}, [view, currentDate]);

	const { data: events = [], isLoading } = useCalendarEvents(householdId, from, to);

	const navigate = (dir: -1 | 1) => {
		setCurrentDate((prev) => {
			const d = new Date(prev);
			if (view === "month") d.setMonth(d.getMonth() + dir);
			else d.setDate(d.getDate() + dir);
			return d;
		});
	};

	const headerLabel = useMemo(() => {
		if (view === "month") return `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
		return currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
	}, [view, currentDate]);

	const handleDayClick = (date: Date) => {
		setCurrentDate(date);
		setView("day");
	};

	const handleSlotClick = (hour: number) => {
		setNewEventDate(currentDate);
		setNewEventHour(hour);
		setSelectedEvent(null);
		setShowModal(true);
	};

	const handleEventClick = (ev: any) => {
		setSelectedEvent(ev);
		setNewEventDate(undefined);
		setShowModal(true);
	};

	const openCreateModal = () => {
		setSelectedEvent(null);
		setNewEventDate(view === "day" ? currentDate : today);
		setNewEventHour(9);
		setShowModal(true);
	};

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
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					{view === "day" && (
						<button onClick={() => setView("month")} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
							<ArrowLeft size={18} />
						</button>
					)}
					<div>
						<h1 className="text-2xl font-bold text-gray-900">📅 Calendrier</h1>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Bouton settings mobile — haut droite */}
					<div className="md:hidden flex">
						<Link href="/settings" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700 transition shadow-sm">
							<Settings size={20} />
						</Link>
					</div>

					{/* Bouton + en haut droite desktop */}
					<button
						onClick={openCreateModal}
						className="hidden sm:flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition"
					>
						<Plus size={18} />
					</button>
				</div>
			</div>

			{/* Barre navigation */}
			<div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-gray-200 px-4 py-2">
				<div className="flex items-center gap-1">
					<button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
						<ChevronLeft size={18} className="text-gray-600" />
					</button>
					<button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
						<ChevronRight size={18} className="text-gray-600" />
					</button>
					<h2 className="font-semibold text-gray-900 ml-1 text-sm sm:text-base capitalize">{headerLabel}</h2>
				</div>
				<button
					onClick={() => {
						setCurrentDate(new Date());
						setView("month");
					}}
					className="text-xs text-primary-600 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition"
				>
					Aujourd'hui
				</button>
			</div>

			{/* Contenu */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="animate-spin text-primary-600" size={24} />
				</div>
			) : view === "month" ? (
				<MonthView currentDate={currentDate} events={events} today={today} onDayClick={handleDayClick} onEventClick={handleEventClick} />
			) : (
				<DayView day={currentDate} events={events} onEventClick={handleEventClick} onSlotClick={handleSlotClick} />
			)}

			{/* Bouton + mobile fixe en bas */}
			<button onClick={openCreateModal} className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-40">
				<Plus size={24} />
			</button>

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
