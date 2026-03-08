'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMyHouseholds, useHouseholdMembers } from '@/hooks/useHousehold'
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from '@/hooks/useCalendar'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2,
  Calendar, Clock, MapPin, Repeat, Bell, Trash2, Edit2, Home,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type {
  CalendarEvent, EventColor, RecurrenceFreq,
  EVENT_COLOR_CLASSES, RECURRENCE_LABELS, REMINDER_OPTIONS,
} from '@homy/shared-types'
import {
  EVENT_COLOR_CLASSES as COLOR_CLASSES,
  RECURRENCE_LABELS as REC_LABELS,
  REMINDER_OPTIONS as REM_OPTIONS,
} from '@homy/shared-types'

// ─── Helpers date ─────────────────────────────────────────────────────────────

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}
function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  // Lundi = début de semaine
  d.setDate(d.getDate() - ((day + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

// ─── Modal création / édition ─────────────────────────────────────────────────

interface EventModalProps {
  householdId: string
  currentUserId: string
  members: any[]
  event?: CalendarEvent | null
  defaultDate?: Date
  onClose: () => void
}

function EventModal({ householdId, currentUserId, members, event, defaultDate, onClose }: EventModalProps) {
  const create = useCreateCalendarEvent(householdId)
  const update = useUpdateCalendarEvent(householdId)
  const remove = useDeleteCalendarEvent(householdId)

  const isEdit = !!event
  const canEdit = !isEdit || event.created_by === currentUserId ||
    members.find((m: any) => m.profiles?.id === currentUserId)?.role === 'admin'

  const pad = (n: number) => String(n).padStart(2, '0')
  const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const defaultStart = defaultDate
    ? `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth()+1)}-${pad(defaultDate.getDate())}T09:00`
    : toDatetimeLocal(new Date().toISOString())

  const [title, setTitle]             = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [location, setLocation]       = useState(event?.location ?? '')
  const [color, setColor]             = useState<EventColor>(event?.color ?? 'blue')
  const [startsAt, setStartsAt]       = useState(event ? toDatetimeLocal(event.starts_at) : defaultStart)
  const [endsAt, setEndsAt]           = useState(event ? toDatetimeLocal(event.ends_at) : defaultStart.replace('T09:00','T10:00'))
  const [allDay, setAllDay]           = useState(event?.all_day ?? false)
  const [recurrence, setRecurrence]   = useState<RecurrenceFreq>(event?.recurrence ?? 'none')
  const [reminders, setReminders]     = useState<number[]>(event?.reminders ?? [60])

  const colors: EventColor[] = ['blue','green','red','orange','purple','pink','yellow','gray']

  const toggleReminder = (val: number) => {
    setReminders(prev =>
      prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]
    )
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
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
    }
    if (isEdit) {
      await update.mutateAsync({ id: event.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cet événement ?')) return
    await remove.mutateAsync(event!.id)
    onClose()
  }

  const isPending = create.isPending || update.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h2>
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
            onChange={e => setTitle(e.target.value)}
            disabled={!canEdit}
            className="w-full text-lg font-semibold border-0 border-b-2 border-gray-200 focus:border-primary-500 outline-none pb-2 bg-transparent placeholder-gray-300"
          />

          {/* Couleur */}
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition ring-offset-2',
                    COLOR_CLASSES[c].bg.replace('bg-', 'bg-').replace('-100', '-400'),
                    color === c && 'ring-2 ring-gray-400'
                  )}
                />
              ))}
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Clock size={15} /> Horaires
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} disabled={!canEdit} />
              Journée entière
            </label>

            {!allDay ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Début</p>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={e => setStartsAt(e.target.value)}
                    disabled={!canEdit}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Fin</p>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                    disabled={!canEdit}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <input
                type="date"
                value={startsAt.split('T')[0]}
                onChange={e => {
                  setStartsAt(`${e.target.value}T00:00`)
                  setEndsAt(`${e.target.value}T23:59`)
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
              onChange={e => setLocation(e.target.value)}
              disabled={!canEdit}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              placeholder="Description (optionnel)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          {/* Récurrence */}
          {canEdit && (
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1">
                <Repeat size={15} /> Répétition
              </label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as RecurrenceFreq)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-primary-500 outline-none bg-white"
              >
                {Object.entries(REC_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
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
                {REM_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleReminder(opt.value)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border transition',
                      reminders.includes(opt.value)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="px-5 pb-6 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isPending}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-2xl hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer l\'événement'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vue Mois ─────────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  today,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date
  events: any[]
  today: Date
  onDayClick: (date: Date) => void
  onEventClick: (event: any) => void
}) {
  const firstDay  = startOfMonth(currentDate)
  const lastDay   = endOfMonth(currentDate)
  // Grille : du lundi avant le 1er au dimanche après le dernier
  const gridStart = startOfWeek(firstDay)
  const totalDays = Math.ceil((lastDay.getTime() - gridStart.getTime()) / 86400000) + 1
  const days      = Array.from({ length: Math.max(totalDays, 35) }, (_, i) => addDays(gridStart, i))

  const eventsByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    events.forEach(ev => {
      const key = new Date(ev.starts_at).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return map
  }, [events])

  return (
    <div>
      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday        = isSameDay(day, today)
          const dayEvents      = eventsByDay.get(day.toDateString()) ?? []

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                'bg-white min-h-[72px] p-1.5 cursor-pointer hover:bg-gray-50 transition',
                !isCurrentMonth && 'opacity-40'
              )}
            >
              <span className={cn(
                'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto mb-1',
                isToday ? 'bg-primary-600 text-white' : 'text-gray-700'
              )}>
                {day.getDate()}
              </span>

              {/* Events du jour (max 2 + overflow) */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 transition',
                      COLOR_CLASSES[ev.color as EventColor]?.bg,
                      COLOR_CLASSES[ev.color as EventColor]?.text,
                    )}
                  >
                    {ev.all_day ? ev.title : `${formatTime(ev.starts_at)} ${ev.title}`}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vue Semaine ──────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  events,
  today,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date
  events: any[]
  today: Date
  onDayClick: (date: Date) => void
  onEventClick: (event: any) => void
}) {
  const weekStart = startOfWeek(currentDate)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours     = Array.from({ length: 24 }, (_, i) => i)

  const eventsByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    events.forEach(ev => {
      const key = new Date(ev.starts_at).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return map
  }, [events])

  return (
    <div className="overflow-x-auto">
      {/* Header jours */}
      <div className="grid grid-cols-8 mb-1 min-w-[600px]">
        <div className="w-12" />
        {days.map((day, i) => (
          <div
            key={i}
            onClick={() => onDayClick(day)}
            className="text-center cursor-pointer py-2"
          >
            <p className="text-xs text-gray-400 font-medium">{DAYS_FR[i]}</p>
            <span className={cn(
              'text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-0.5',
              isSameDay(day, today) ? 'bg-primary-600 text-white' : 'text-gray-700'
            )}>
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* Grille heures */}
      <div className="relative min-w-[600px] max-h-[60vh] overflow-y-auto border border-gray-100 rounded-2xl">
        {hours.map(h => (
          <div key={h} className="grid grid-cols-8 border-b border-gray-50 last:border-0">
            <div className="w-12 text-right pr-2 text-xs text-gray-300 py-2 sticky left-0 bg-white">
              {h}:00
            </div>
            {days.map((day, di) => {
              const dayEvents = (eventsByDay.get(day.toDateString()) ?? []).filter(ev => {
                const evH = new Date(ev.starts_at).getHours()
                return evH === h && !ev.all_day
              })
              return (
                <div
                  key={di}
                  onClick={() => onDayClick(day)}
                  className="border-l border-gray-50 min-h-[40px] p-0.5 cursor-pointer hover:bg-gray-50 transition relative"
                >
                  {dayEvents.map((ev: any) => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      className={cn(
                        'text-xs px-1.5 py-1 rounded-md truncate mb-0.5 cursor-pointer hover:opacity-80',
                        COLOR_CLASSES[ev.color as EventColor]?.bg,
                        COLOR_CLASSES[ev.color as EventColor]?.text,
                      )}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { data: householdsData, isLoading: loadingHouseholds } = useMyHouseholds()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [view, setView]         = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [showModal, setShowModal]         = useState(false)
  const [newEventDate, setNewEventDate]   = useState<Date | undefined>()

  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (householdsData?.length && !householdId) {
      setHouseholdId((householdsData[0] as any).households.id)
    }
  }, [householdsData, householdId])

  const { data: membersData = [] } = useHouseholdMembers(householdId)

  // Plage de dates à charger selon la vue
  const { from, to } = useMemo(() => {
    if (view === 'month') {
      const s = startOfWeek(startOfMonth(currentDate))
      const e = addDays(s, 41)
      return { from: s.toISOString(), to: e.toISOString() }
    } else {
      const s = startOfWeek(currentDate)
      return { from: s.toISOString(), to: addDays(s, 7).toISOString() }
    }
  }, [view, currentDate])

  const { data: events = [], isLoading } = useCalendarEvents(householdId, from, to)

  // Navigation
  const navigate = (dir: -1 | 1) => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() + dir)
      else d.setDate(d.getDate() + dir * 7)
      return d
    })
  }

  const headerLabel = view === 'month'
    ? `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const ws = startOfWeek(currentDate)
        const we = addDays(ws, 6)
        return `${ws.getDate()} – ${we.getDate()} ${MONTHS_FR[we.getMonth()]} ${we.getFullYear()}`
      })()

  const handleDayClick = (date: Date) => {
    setNewEventDate(date)
    setSelectedEvent(null)
    setShowModal(true)
  }

  const handleEventClick = (event: any) => {
    setSelectedEvent(event)
    setNewEventDate(undefined)
    setShowModal(true)
  }

  if (loadingHouseholds) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
  }

  if (!householdsData?.length) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
        <Home size={40} className="mx-auto text-gray-300 mb-4" />
        <h2 className="font-semibold text-gray-600 mb-1">Aucun foyer</h2>
        <p className="text-gray-400 text-sm mb-4">Tu dois créer ou rejoindre un foyer.</p>
        <Link href="/household" className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">
          Gérer mes foyers
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendrier</h1>
          <p className="text-gray-500 text-sm mt-1">Événements du foyer</p>
        </div>
        <button
          onClick={() => { setSelectedEvent(null); setNewEventDate(today); setShowModal(true) }}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition"
        >
          <Plus size={16} /><span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>

      {/* Barre de navigation */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
          <h2 className="font-semibold text-gray-900 ml-2 text-sm sm:text-base">{headerLabel}</h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-primary-600 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition mr-1"
          >
            Aujourd'hui
          </button>
          {/* Toggle vue */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['month', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'text-xs font-medium px-2.5 py-1.5 rounded-lg transition',
                  view === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                )}
              >
                {v === 'month' ? 'Mois' : 'Semaine'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sélecteur de foyer si plusieurs */}
      {householdsData && householdsData.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {householdsData.map((h: any) => (
            <button
              key={h.households.id}
              onClick={() => setHouseholdId(h.households.id)}
              className={cn(
                'text-sm font-medium px-3 py-1.5 rounded-xl whitespace-nowrap transition',
                householdId === h.households.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {h.households.name}
            </button>
          ))}
        </div>
      )}

      {/* Calendrier */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={24} />
        </div>
      ) : view === 'month' ? (
        <MonthView
          currentDate={currentDate}
          events={events}
          today={today}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          events={events}
          today={today}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      )}

      {/* Modal */}
      {showModal && householdId && currentUserId && (
        <EventModal
          householdId={householdId}
          currentUserId={currentUserId}
          members={membersData}
          event={selectedEvent}
          defaultDate={newEventDate}
          onClose={() => { setShowModal(false); setSelectedEvent(null) }}
        />
      )}
    </div>
  )
}
