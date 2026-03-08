// ─── Enums ───────────────────────────────────────────────────────────────────

export type EventColor =
  | 'blue' | 'green' | 'red' | 'orange'
  | 'purple' | 'pink' | 'yellow' | 'gray'

export type RecurrenceFreq =
  | 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

// ─── Database rows ───────────────────────────────────────────────────────────

export interface CalendarEvent {
  id:              string
  household_id:    string
  created_by:      string
  title:           string
  description:     string | null
  location:        string | null
  color:           EventColor
  starts_at:       string   // ISO 8601
  ends_at:         string   // ISO 8601
  all_day:         boolean
  recurrence:      RecurrenceFreq
  recurrence_end:  string | null  // YYYY-MM-DD
  reminders:       number[]       // minutes avant (ex: [10, 60])
  participant_ids: string[] | null // null = tout le foyer
  created_at:      string
  updated_at:      string
}

export interface PushSubscription {
  id:         string
  user_id:    string
  endpoint:   string
  p256dh:     string
  auth:       string
  user_agent: string | null
  created_at: string
  updated_at: string
}

export interface NotificationLog {
  id:          string
  event_id:    string
  user_id:     string
  reminder_min: number
  sent_at:     string
}

// ─── Vue upcoming_events ─────────────────────────────────────────────────────

export interface UpcomingEvent extends CalendarEvent {
  creator_name:    string
  household_name:  string
}

// ─── Payloads pour les mutations ─────────────────────────────────────────────

export interface CreateCalendarEventPayload {
  household_id:    string
  title:           string
  description?:    string
  location?:       string
  color?:          EventColor
  starts_at:       string
  ends_at:         string
  all_day?:        boolean
  recurrence?:     RecurrenceFreq
  recurrence_end?: string
  reminders?:      number[]
  participant_ids?: string[]
}

export interface UpdateCalendarEventPayload extends Partial<CreateCalendarEventPayload> {
  id: string
}

// ─── Labels UI ───────────────────────────────────────────────────────────────

export const EVENT_COLOR_LABELS: Record<EventColor, string> = {
  blue:   'Bleu',
  green:  'Vert',
  red:    'Rouge',
  orange: 'Orange',
  purple: 'Violet',
  pink:   'Rose',
  yellow: 'Jaune',
  gray:   'Gris',
}

export const EVENT_COLOR_CLASSES: Record<EventColor, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  green:  { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300' },
  red:    { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-800',   border: 'border-pink-300' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-800',   border: 'border-gray-300' },
}

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  none:      'Pas de répétition',
  daily:     'Chaque jour',
  weekly:    'Chaque semaine',
  biweekly:  'Toutes les 2 semaines',
  monthly:   'Chaque mois',
  yearly:    'Chaque année',
}

export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0,    label: 'Au moment de l\'événement' },
  { value: 5,    label: '5 minutes avant' },
  { value: 10,   label: '10 minutes avant' },
  { value: 30,   label: '30 minutes avant' },
  { value: 60,   label: '1 heure avant' },
  { value: 120,  label: '2 heures avant' },
  { value: 1440, label: '1 jour avant' },
  { value: 2880, label: '2 jours avant' },
]
